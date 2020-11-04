const fetch = require('node-fetch')

// Using luxafor-api package to interface with hardware
const { device } = require('luxafor-api')

// Connect to the first available (connected) flag
const luxaforFlag = device()

const watchMedia = () => {
  setInterval(async () => {
    // eslint-disable-next-line no-console
    console.log('Fetching')
    const response = await fetch(
      'https://oneyearonemediaserver.herokuapp.com/api/profiles'
    )
    const data = await response.json()
    const myMedia = data.filter((profile) => profile.consumer_name === 'Benc')
    const completedMedia = myMedia.every((item) => item.completed)

    if (completedMedia) {
      luxaforFlag.color('green')
    } else {
      luxaforFlag.color('red')
    }
  }, 1000)
}
