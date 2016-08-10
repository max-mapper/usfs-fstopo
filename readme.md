# usfs-fstopo

Scrapes all the FSTopo topographic forest PDF maps from [the U.S. Forest Service FSTopo website](http://data.fs.usda.gov/geodata/rastergateway/states-regions/states.php).

This exists because I could not find a way to download all FSTopo PDFs, if anyone knows a bulk download source let me know. I use these PDFs on my phone using Avenza PDFMaps, which is a free geo-enabled-PDF offline viewer that lets you view where you are using GPS on top of these PDFs without a data connection when you're adventuring in national forests.

You can run the scraper yourself: `npm install && npm start` or just use the `data.json` from my last scrape.

To download all the URLs, run `cat data.json | jsonfilter *.pdfs.* | xargs nugget -c -d pdfs` (jsonfilter and nugget are from npm)