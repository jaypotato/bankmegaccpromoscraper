const cheerio = require('cheerio');
const rp      = require('request-promise');
const Promise = require('bluebird');
const fs      = require('fs');
const {performance} = require('perf_hooks');

const baseUrl = 'https://bankmega.com/'; //promolainnya.php';

let initScrap = (uri) => {
    return {
        uri : uri == '' ? baseUrl : uri,
        transform: function (body) {
            return cheerio.load(body);
        }
    }
};

eachPromoPromise = (task, meta) => {
    return new Promise((resolve, reject) => {
        let eachPromoObj = new Object();
        rp(initScrap(task)).
        then(($) => {
            eachPromoObj.title          = $('.titleinside').children().text();
            eachPromoObj.area           = $('.area').text().split(' ').pop().trim();
            eachPromoObj.periode        = $('.periode').text().split(':').pop().trim().replace(/\n\t+/,'');
            let descImage               = $('.keteranganinside img').attr('src');
            eachPromoObj.descImage      = baseUrl + descImage.substring(1);
            eachPromoObj.link           = task;
            eachPromoObj.previewImg     = meta;
            resolve(eachPromoObj);
        })
        .catch((err) => {
            reject(err);
        });
    });
}

let eachPagePromise = (task) => {
    return new Promise((resolve, reject) => {
        let PromoDetail = [];
        rp(initScrap(task)).
        then(($) => {
            $('li').each((index, elem) => {
                let getDetailPromoLink  = $(elem).children().attr('href')
                let detailPromoLink     = getDetailPromoLink.includes("http") ? getDetailPromoLink : baseUrl+getDetailPromoLink;
                let prevImg             = baseUrl+$(elem).children().children().attr('src');
                PromoDetail.push(eachPromoPromise(detailPromoLink, prevImg));
            });
            Promise.all(PromoDetail).then((results) => {
                resolve(results);
            });
        })
        .catch((err) => {
            reject(err);
        });
    });
}

let eachCategoryPromise = (task, meta) => {
    return new Promise((resolve, reject) => {
        let pages;
        let getPages;
        rp(initScrap(task)).
            then(($) => {
                getPages = $('.tablepaging tbody tr').children().last().children().attr('title'); 
                if(getPages !== undefined) {
                    pages = getPages.includes("of") ? getPages.split(" ")[3] : 1;
                    let promoOnCategory = [];
                    for(page = 1; page <= pages; page++) {
                        promoOnCategory.push(eachPagePromise(task+page));
                    }
                    Promise.all(promoOnCategory).then((results) => {
                        concatResult = [].concat(...results);
                        resolve({
                            [meta] : concatResult,
                        });
                    });
                } else {
                    resolve({
                        [meta] : [{}]
                    });
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
}; 

console.log('Program started...');
const start = performance.now();
const categories = [];
rp(initScrap(baseUrl+'promolainnya.php'))
    .then(($) => {
        $('#subcatpromo div').each(function(i, elem) {
            let Category = new Object();
            Category.id     = i+1;
            // Category.idTag  = $(elem).children().attr('id');
            Category.name   = $(elem).children().attr('title');
            categories.push(Category);
            
        });

        // category promises to make
        let categoryPromises = [];
        categories.forEach((Category, index) => {
            categoryUrl = baseUrl + 'ajax.promolainnya.php?product=0&subcat='+Category.id+'&page=';
            categoryPromises.push(eachCategoryPromise(categoryUrl, Category.name));
        });
        
        Promise.all(categoryPromises).then((results) => {
            let merged = Object.assign(...results);
            fs.writeFile("./solution.json", JSON.stringify(merged, null, 4), (err) => {
                if(err) {
                    console.error(err);
                    return;
                };
                const end = performance.now() - start;
                console.log("Success... solution.json has been created.\nProgram took "+end+" milliseconds.");
            });            
        });
    })
    .catch((err) => {
        console.error(err);
    });

