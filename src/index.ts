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

// wire processor function for queued messages
subscribersQ.process(async (job, done) => {
    const { email } = job.data

    const mailOptions = {
        from: process.env.MAIL_FROM,
        to: email,
        subject: process.env.MAIL_SUBJ,
        text: process.env.MAIL_TEXT,
    }

    await new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                reject(err)
            } else {
                resolve(info)
            }
        })
    }).then((value) => {
        console.debug(`[BULL] Processed e-mail address: ${email}`)
        done()
    }).catch(error => {
        console.error(error)
        console.error(`[BULL] Failed to process e-mail address: ${email}`)
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
const port = +process.env.PORT! || 3333
const host = process.env.HOST || "localhost"

app.listen(port, host, 
    () => console.log(`[EXPRESS] listening on ${host}:${port}...`))