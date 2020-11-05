const fs = require('fs')
const readline = require('readline')
const { google } = require('googleapis')
const { device } = require('luxafor-api')
const luxaforFlag = device()

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
const TOKEN_PATH = 'token.json'

// Gives console logs and errors a nice little timestamp
require('console-stamp')(console, { label: false })

const watchMeetings = () => {
  setInterval(() => {
    const currentHour = new Date().getHours()
    const isBetweenWorkHours = currentHour >= 7 && currentHour <= 15

    // Between 7am and 3pm
    if (!isBetweenWorkHours) {
      return console.log('Not polling: we only care about work hours')
    }

    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
      if (err) return console.error('Error loading client secret file:', err)
      // Authorize a client with credentials, then call the Google Calendar API.
      authorize(JSON.parse(content), getNextEvent)
    })
  }, 5000)
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  )

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback)
    oAuth2Client.setCredentials(JSON.parse(token))
    return callback(oAuth2Client)
  })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  })
  console.log('Authorize this app by visiting this url:', authUrl)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close()
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err)
      oAuth2Client.setCredentials(token)
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err)
        console.log('Token stored to', TOKEN_PATH)
      })
      callback(oAuth2Client)
    })
  })
}

/**
 * Gets the next event on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getNextEvent(auth) {
  const calendar = google.calendar({ version: 'v3', auth })
  calendar.events.list(
    {
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 1,
      singleEvents: true,
      orderBy: 'startTime',
    },
    (err, res) => {
      if (err) return console.error('The API returned an error: ' + err)

      const nextEvent = res.data && res.data.items && res.data.items[0]
      const isConfirmed = nextEvent.status === 'confirmed'

      // eslint-disable-next-line no-console
      // console.log('nextEvent:', nextEvent)

      if (!nextEvent || !isConfirmed) {
        return console.log('No accepted/upcoming events found.')
      }

      const currentTime = new Date()
      const meetingStartTime = new Date(nextEvent.start.dateTime)
      const secondsUntilNextMeeting = Math.round(
        (meetingStartTime - currentTime) / 1000
      )
      const meetingIsComingUp = secondsUntilNextMeeting <= 30
      const meetingHasStarted = secondsUntilNextMeeting <= 0

      if (meetingHasStarted) {
        return console.log('Currently in the middle of a meeting.')
      }

      if (!meetingIsComingUp) {
        return console.log(
          `Next meeting in ${secondsUntilNextMeeting} seconds.`
        )
      }

      // Alert user
      luxaforFlag.police(2)
    }
  )
}

exports.watchMeetings = watchMeetings
