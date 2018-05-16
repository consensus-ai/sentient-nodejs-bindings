// sentient.js: a lightweight node wrapper for starting, and communicating with
// a Sen daemon (sentientd).
import BigNumber from 'bignumber.js'
import fs from 'fs'
import { spawn } from 'child_process'
import Path from 'path'
import request from 'request'
import http from 'http'

const agent = new http.Agent({
	keepAlive: true,
	maxSockets: 20,
})

// sentient.js error constants
export const errCouldNotConnect = new Error('could not connect to the sentient-network daemon')

// Sen -> hastings unit conversion functions
// These make conversion between units of Sen easy and consistent for developers.
// Never return exponentials from BigNumber.toString, since they confuse the API
BigNumber.config({ EXPONENTIAL_AT: 1e+9 })
BigNumber.config({ DECIMAL_PLACES: 30 })

const hastingsPerSen = new BigNumber('10').toPower(24)
const senToHastings = (sen) => new BigNumber(sen).times(hastingsPerSen)
const hastingsToSen = (hastings) => new BigNumber(hastings).dividedBy(hastingsPerSen)

// makeRequest takes an address and opts and returns a valid request.js request
// options object.
export const makeRequest = (address, opts) => {
	let callOptions = opts
	if (typeof opts === 'string') {
		callOptions = { url: opts }
	}
	callOptions.url = 'http://' + address + callOptions.url
	callOptions.json = true
	if (typeof callOptions.timeout === 'undefined') {
		callOptions.timeout = 10000
	}
	callOptions.headers = {
		'User-Agent': 'Sentient-Agent',
	}
	callOptions.pool = agent

	return callOptions
}

// Call makes a call to the Sen API at `address`, with the request options defined by `opts`.
// returns a promise which resolves with the response if the request completes successfully
// and rejects with the error if the request fails.
const call = (address, opts) => new Promise((resolve, reject) => {
	const callOptions = makeRequest(address, opts)
	request(callOptions, (err, res, body) => {
		if (!err && (res.statusCode < 200 || res.statusCode > 299)) {
			reject(body)
		} else if (!err) {
			resolve(body)
		} else {
			reject(err)
		}
	})
})

// launch launches a new instance of sentientd using the flags defined by `settings`.
// this function can `throw`, callers should catch errors.
// callers should also handle the lifecycle of the spawned process.
const launch = (path, settings) => {
	const defaultSettings = {
		'api-addr': 'localhost:9980',
		'rpc-addr': ':9981',
		'authenticate-api': false,
		'disable-api-security': false,
	}
	const mergedSettings = Object.assign(defaultSettings, settings)
	const filterFlags = (key) => mergedSettings[key] !== false
	const mapFlags = (key) => '--' + key + '=' + mergedSettings[key]
	const flags = Object.keys(mergedSettings).filter(filterFlags).map(mapFlags)

	const sentientdOutput = (() => {
		if (typeof mergedSettings['sen-directory'] !== 'undefined') {
			return fs.createWriteStream(Path.join(mergedSettings['sen-directory'], 'sentientd-output.log'))
		}
		return fs.createWriteStream('sentientd-output.log')
	})()

	const opts = { }
	if (process.geteuid) {
		opts.uid = process.geteuid()
	}
	const sentientdProcess = spawn(path, flags, opts)
	sentientdProcess.stdout.pipe(sentientdOutput)
	sentientdProcess.stderr.pipe(sentientdOutput)
	return sentientdProcess
}

// isRunning returns true if a successful call can be to /gateway
// using the address provided in `address`.  Note that this call does not check
// whether the sentientd process is still running, it only checks if a Sen API is
// reachable.
async function isRunning(address) {
	try {
		await call(address, {
			url: '/gateway',
			timeout: 6e5, // 10 minutes
		})
		return true
	} catch (e) {
		return false
	}
}

// sentientdWrapper returns an instance of a Sentientd API configured with address.
const sentientdWrapper = (address) => {
	const sentientdAddress = address
	return {
		call: (options)  => call(sentientdAddress, options),
		isRunning: () => isRunning(sentientdAddress),
	}
}

// connect connects to a running Sentientd at `address` and returns a sentientdWrapper object.
async function connect(address) {
	const running = await isRunning(address)
	if (!running) {
		throw errCouldNotConnect
	}
	return sentientdWrapper(address)
}

export {
	connect,
	launch,
	isRunning,
	call,
	senToHastings,
	hastingsToSen,
	agent,
}
