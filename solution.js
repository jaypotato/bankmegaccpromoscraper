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


let promiseGenerator = (task, meta) => {
    return new Promise((resolve, reject) => {
        let pages;
        let getPages;
        rp(initScrap(task)).
            then(($) => {
                getPages = $('.tablepaging tbody tr').children().last().children().attr('title'); 
                if(getPages !== undefined) {
                    pages = getPages[getPages.length - 1];
                    // console.log(pages);
                    let promoOnCategory = [];
                    for(page = 1; page <= pages; page++) {
                        rp(initScrap(task+page)).
                            then(($) => {
                                $('li').each((index, elem) => {
                                    let promoObject   = new Object();
                                    promoObject.link  = baseUrl+$(elem).children().attr('href');
                                    promoObject.title = $(elem).children().children().attr('title');
                                    promoObject.image = baseUrl+$(elem).children().children().attr('src');
                                    promoOnCategory.push(promoObject);
                                });
                                resolve({
                                    [meta] : promoOnCategory,
                                });
                            })
                            .catch((err) => {
                                reject(err);
                            });
                    }
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
            categoryPromises.push(promiseGenerator(categoryUrl, Category.name));
        });
        
        Promise.all(categoryPromises).then((results) => {
            // let merged = Object.assign(...results);
            fs.writeFile("./solution.json", JSON.stringify(results), (err) => {
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