This is a [Nodejs](https://nodejs.org/) wrapper for
[sentient-network](https://github.com/consensus-ai/sentient-network). Use it in your apps to easily
interact with the sentient-netowrk via function calls instead of manual http
requests.

It was originally forked from [Sia](https://github.com/NebulousLabs/Sia)'s [Nodejs-Sia](https://github.com/NebulousLabs/Nodejs-Sia) library.

## Prerequisites

- [node & npm (version 5.9.0+ recommended)](https://nodejs.org/download/)

## Installation

```
npm install sia.js
```

## Local Development
You can specify a local path for this library in the importing `package.json` file like so:
```js
{
  // ...
  "dependencies": {
    // ...
    "sia.js": "file:../nodejs-sentient"
  }
}
```

Just make sure not to commit this change as it will break for other users and in CI.

You must run `npm install` before using this library.

## Example Usage

```js
import { connect } from 'sia.js'

// Using promises...
// connect to an already running Sia daemon on localhost:9980 and print its version
connect('localhost:9980')
  .then((siad) => {
    siad.call('/daemon/version').then((version) => console.log(version))
  })
  .catch((err) => {
    console.error(err)
  })

// Or ES7 async/await
async function getVersion() {
  try {
    const siad = await connect('localhost:9980')
    const version = await siad.call('/daemon/version')
    console.log('Siad has version: ' + version)
  } catch (e) {
    console.error(e)
  }
}

```
You can also forgo using `connect` and use `call` directly by providing an API address as the first parameter:

```js
import { call } from 'sia.js'

async function getVersion(address) {
  try {
    const version = await call(address, '/daemon/version')
    return version
  } catch (e) {
    console.error('error getting ' + address + ' version: ' + e.toString())
  }
}

console.log(getVersion('10.0.0.1:9980'))
```

`sia.js` can also launch a siad instance given a path on disk to the `siad` binary.  `launch` takes an object defining the flags to use as its second argument, and returns the `child_process` object.  You are responsible for keeping track of the state of this `child_process` object, and catching any errors `launch` may throw.

```js
import { launch } from 'sia.js'

try {
  // Flags are passed in as an object in the second argument to `launch`.
  // if no flags are passed, the default flags will be used.
  const siadProcess = launch('/path/to/your/siad', {
    'modules': 'cghmrtw',
    'profile': true,
  })
  // siadProcess is a ChildProcess class.  See https://nodejs.org/api/child_process.html#child_process_class_childprocess for more information on what you can do with it.
  siadProcess.on('error', (err) => console.log('siad encountered an error ' + err))
} catch (e) {
  console.error('error launching siad: ' + e.toString())
}
```

The call object passed as the first argument into call() are funneled directly
into the [`request`](https://github.com/request/request) library, so checkout
[their options](https://github.com/request/request#requestoptions-callback) to
see how to access the full functionality of [Sia's
API](https://github.com/NebulousLabs/Sia/blob/master/doc/API.md)

```js
Siad.call({
  url: '/consensus/block',
  method: 'GET',
  qs: {
    height: 0
  }
})
```

Should log something like:

```bash
null { block:
 { parentid: '0000000000000000000000000000000000000000000000000000000000000000',
   nonce: [ 0, 0, 0, 0, 0, 0, 0, 0 ],
   timestamp: 1433600000,
   minerpayouts: null,
   transactions: [ [Object] ] } }
```
