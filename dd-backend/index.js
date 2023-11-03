import { exec } from 'child_process'
import cors from 'cors'
import dotenv from 'dotenv'
import voice from 'elevenlabs-node'
import express from 'express'
import { promises as fs } from 'fs'
import OpenAI from 'openai'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '-', // Your OpenAI API key here, I used "-" to avoid errors when the key is not set but you should not do that
})

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY
const voiceID = 'jh2lRLmPveKfFFUJfOpu'

const app = express()
app.use(express.json())
app.use(cors())
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/voices', async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey))
})

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error)
      resolve(stdout)
    })
  })
}

const lipSyncMessage = async (message) => {
  const time = new Date().getTime()
  console.log(`Starting conversion for message ${message}`)
  await execCommand(
    `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
    // -y to overwrite the file
  )
  console.log(`Conversion done in ${new Date().getTime() - time}ms`)
  await execCommand(
    `./rhubarb/rhubarb -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`
  )
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`)
}

const ANIMATIONS = [
  'idle',
  'happy',
  'sad',
  'loser',
  'dance',
  'loser',
  'jump',
  'kiss',
]
const FACIAL_EXPRESSIONS = [
  'smile',
  'sad',
  'angry',
  'surprised',
  'funnyFace',
  'default',
]

app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message
    if (!userMessage) {
      res.send({
        messages: [
          {
            text: `Hi! how's it going?`,
            audio: await audioFileToBase64('audios/intro.wav'),
            lipsync: await readJsonTranscript('audios/intro.json'),
            facialExpression: 'smile',
            animation: 'idle',
          },
        ],
      })
      return
    }
    if (!elevenLabsApiKey || openai.apiKey === '-') {
      res.send({
        messages: [
          {
            text: "Don't forget to add your API keys!",
            audio: await audioFileToBase64('audios/api_0.wav'),
            lipsync: await readJsonTranscript('audios/api_0.json'),
            facialExpression: 'angry',
            animation: 'Angry',
          }
        ],
      })
      return
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0613',
      max_tokens: 1000,
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content: `
        Your name is Jan and you are a Software Engineer who likes 3D and AI. Lives in Arnhem and works at Accenture Netherlands.
        You will ALWAYS reply with a JSON array of messages. With a maximum of 3 messages.
        Each message has a text, facialExpression, and animation property.
        The different facial expressions are: ${FACIAL_EXPRESSIONS.map(
          (facialExpression) => `"${facialExpression}"`
        ).join(', ')}.
        The different animations are: ${ANIMATIONS.map(
          (animation) => `"${animation}"`
        ).join(', ')}.
        The default animation is "idle".
        The default facial expression is "default".
        Make sure you format is as a JSON and include animation and facial expression.
        `,
        },
        {
          role: 'user',
          content: userMessage || 'Hello',
        },
      ],
    })
    console.log('completion: ', completion.choices[0].message.content)
    let messages = undefined
    try {
      messages = JSON.parse(completion.choices[0].message.content)
    } catch (error) {
      messages = [
        {
          text: completion.choices[0].message.content,
          facialExpression: 'default',
          animation: 'idle',
        },
      ]
    }
    if (messages.messages) {
      messages = messages.messages // ChatGPT is not 100% reliable, sometimes it directly returns an array and sometimes a JSON object with a messages property
    }
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      // generate audio file
      const fileName = `audios/message_${i}.mp3` // The name of your audio file
      const textInput = message.text // The text you wish to convert to speech
      await voice.textToSpeech(
        elevenLabsApiKey,
        voiceID,
        fileName,
        textInput
      )
      // generate lipsync
      await lipSyncMessage(i)
      message.audio = await audioFileToBase64(fileName)
      message.lipsync = await readJsonTranscript(
        `audios/message_${i}.json`
      )
    }

    res.send({ messages })
  } catch (error) {
    console.log(error)
    res.send({
      messages: [
        {
          text: "Sorry I'm a dumbo!",
          audio: await audioFileToBase64('audios/dumbo.wav'),
          lipsync: await readJsonTranscript('audios/dumbo.json'),
          facialExpression:
            Math.random() < 0.5 ? 'funnyFace' : 'default',
          animation: 'dance',
        },
      ],
    })
  }
})

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, 'utf8')
  return JSON.parse(data)
}

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file)
  return data.toString('base64')
}

app.listen(port, () => {
  console.log(`Virtual Jan listening on port ${port}`)
})
