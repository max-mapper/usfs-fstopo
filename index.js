var electron = require('electron')
var app = require('app')
var runSeries = require('run-series')

app.on('ready', function () {
  var win = new electron.BrowserWindow({width: 800, height: 600})
  win.on('closed', function () {
    win = null
  })
  
  console.error('loading initial page...')
  win.loadURL('https://data.fs.usda.gov/geodata/rastergateway/states-regions/quad-index.php')

  win.webContents.on('dom-ready', function () {
    win.webContents.executeJavaScript(`
      var rows = document.querySelectorAll('#skipheader tbody td a')
      var ids = []
      Array.prototype.slice.call(rows).forEach(function (r) {
        ids.push(r.getAttribute('href'))
      })
      
      var ipc = require('electron').ipcRenderer
      ipc.send('ids', ids)
    `)
  })
  
  electron.ipcMain.once('ids', function (event, ids) {
    var idSeries = []
    ids.forEach(function (id) {
      idSeries.push(function (cb) {
        getPDFs(id, function (err, pdfs) {
          if (err) throw err
          pdfs.pdfs.forEach(function (pdf) {
            console.log(JSON.stringify(pdf))
          })
          cb(null)
        })
      })
    })
    runSeries(idSeries, function (err) {
      win.close()
    })
  })
  
  function getPDFs (id, cb) {
    console.error('Getting PDF URLs', id)
    win.loadURL('https://data.fs.usda.gov/geodata/rastergateway/states-regions/' + id)

    win.webContents.on('dom-ready', function () {
      win.webContents.executeJavaScript(`
        var path = require('path')
        var links = document.querySelectorAll('#skipheader ul a')
        var pdfs = []
        Array.prototype.slice.call(links).forEach(function (link) {
          pdfs.push('http://data.fs.usda.gov/geodata/rastergateway' + link.getAttribute('href').slice(2))
        })
        var ipc = require('electron').ipcRenderer
        ipc.send('${id}', pdfs)
      `)
    })
    electron.ipcMain.once(id, function (event, pdfs) {
      cb(null, {pdfs: pdfs})
    })
  }
})
