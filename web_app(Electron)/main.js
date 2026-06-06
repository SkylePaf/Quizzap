const { app, BrowserWindow } = require('electron')
const path = require('path')

app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  win.setIcon(path.join(__dirname, 'src', 'assets', 'icon.png'))
  win.setMenu(null)
  win.loadFile(path.join(__dirname, 'src', 'index.html'))
  win.webContents.on('context-menu', (e) => {
    e.preventDefault()
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})