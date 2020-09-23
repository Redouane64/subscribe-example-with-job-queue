import "dotenv"

import Bull from "bull"
import express from "express"
import mailer from "nodemailer"
import { config } from "dotenv"

// load env variables
config()

// Bull queue
const subscribersQ = new Bull("subscribers", {
    // This is optional, but recommended for persistance of messages
    // for later re-processing.
    redis: {
        host: process.env.REDIS_HOST,
        port: +process.env.REDIS_PORT!
    }
    
})

// wire listener to queue active event
subscribersQ.on("active", () => console.debug("[BULL] Q is active."))

// report job
const reportingQ = new Bull("reporting", {
    redis: {
        host: process.env.REDIS_HOST,
        port: +process.env.REDIS_PORT!
    }
})
reportingQ.process(async (job, done) => {
    // TODO: message should be customized with actual number of subscribers.
    await sendEmail("redouane.sobaihi2@gmail.com", "Subscribers Report", "You have 0 new subscribers.")
        .then(() => {
            console.debug("[BULL] Report sent successfully.")
            done()
        })
        .catch((error) => {
            console.error(`[BULL] Failed to process report job`)
            console.error(error.message)
        })
})
reportingQ.add({ }, { delay: 300000, repeat: { every: 300000 /* 5 min */ }, priority: 1 })

// Send an email helper
const sendEmail = (to: string, subject?: string, text?: string) => {

    const mailOptions = {
        from: process.env.MAIL_FROM,
        to,
        subject: subject || process.env.MAIL_SUBJ,
        text: text || process.env.MAIL_TEXT,
    }

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                reject(err)
            } else {
                resolve(info)
            }
        })
    })
}

// wire processor function for queued messages
subscribersQ.process(async (job, done) => {
    const { email } = job.data

    await sendEmail(email).then((value) => {
        console.debug(`[BULL] Processed e-mail address: ${email}`)
        done()
    }).catch(error => {
        console.error(`[BULL] Failed to process e-mail address: ${email}`)
        console.error(error.message)
    })

})

// configure nodemailer
const transporter = mailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
        user: process.env.MAIL_AUTH_USER,
        pass: process.env.MAIL_AUTH_PASS
    }
})

// create express application
const app = express()

// configure express route
app.post("/subscribe", async (req, res) => {

    const email = req.query.email

    console.info(`[EXPRESS] Subscribing e-mail address: ${email}`)

    const job = await subscribersQ.add({ email }, { delay: 2000 })
    console.debug(`[EXPRESS] Queued job: ${JSON.stringify({ id: job.id })}`)

    return res.send({
        message: "You've subscribed successfully."
    })
})

// start listening to incoming requests on provided port
const port = +process.env.PORT!
const host = process.env.HOST

app.listen(port, host!, 
    () => console.log(`[EXPRESS] listening on ${host}:${port}...`))