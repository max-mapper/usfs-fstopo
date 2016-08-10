var electron = require('electron')
var app = require('app')
var runSeries = require('run-series')

app.on('ready', function () {
  var win = new electron.BrowserWindow({width: 800, height: 600})
  win.on('closed', function () {
    win = null
  })
  
  win.loadURL('http://data.fs.usda.gov/geodata/rastergateway/states-regions/states.php')

  win.webContents.on('dom-ready', function () {
    win.webContents.executeJavaScript(`
      var rows = document.querySelectorAll('.fcTable tr')
      var states = []
      Array.prototype.slice.call(rows).forEach(function (r) {
        var state = r.querySelector('td a')
        if (!state) return
        var stateID = state.getAttribute('href').split('stateID=')[1]
        if (!stateID) return
        states.push(stateID)
      })
      
      var ipc = require('electron').ipcRenderer
      ipc.send('states', states)
    `)
  })
  
  electron.ipcMain.once('states', function (event, states) {
    var stateSeries = []
    states.forEach(function (state) {
      stateSeries.push(function (cb) {
        getGrids(state, function (err, grids) {
          if (err) throw err
          var gridSeries = []
          grids.forEach(function (grid) {
            gridSeries.push(function (cb) {
              getPDFs(state, grid, cb)
            })
          })
          runSeries(gridSeries, cb)
        })
      })
    })
    runSeries(stateSeries, function (err, results) {
      var flattened = []
      results.forEach(function (r) { flattened = flattened.concat(r) })
      console.log(JSON.stringify(results, null, '  '))
      win.close()
    })
  })
  
  function getGrids (state, cb) {
    win.loadURL('http://data.fs.usda.gov/geodata/rastergateway/states-regions/states_zoom.php?stateID=' + state)

    win.webContents.on('dom-ready', function () {
      win.webContents.executeJavaScript(`
        var areas = document.querySelectorAll('area[shape="POLY"]')
        var grids = []
        Array.prototype.slice.call(areas).forEach(function (area) {
          grids.push({href: area.getAttribute('href'), title: area.getAttribute('title')})
        })
        var ipc = require('electron').ipcRenderer
        ipc.send('${state}', grids)
      `)
    })
    electron.ipcMain.once(state, function (event, grids) {
      cb(null, grids)
    })
  }
  
  function getPDFs (state, grid, cb) {
    console.log('Getting PDF URLs', state, grid.href)
    win.loadURL('http://data.fs.usda.gov/geodata/rastergateway/states-regions/' + grid.href)

    win.webContents.on('dom-ready', function () {
      win.webContents.executeJavaScript(`
        var path = require('path')
        var links = document.querySelectorAll('#listPDF .tabLink')
        var pdfs = []
        Array.prototype.slice.call(links).forEach(function (link) {
          pdfs.push('http://data.fs.usda.gov/geodata/rastergateway' + link.getAttribute('href').slice(2))
        })
        var ipc = require('electron').ipcRenderer
        ipc.send('${state}-${grid.title}', pdfs)
      `)
    })
    electron.ipcMain.once(state + '-' + grid.title, function (event, pdfs) {
      cb(null, {state: state, grid: grid.title, pdfs: pdfs})
    })
  }
})
