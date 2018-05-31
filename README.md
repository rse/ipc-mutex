
IPC-Mutex
=========

Inter-Process-Communication (IPC) Mutual Exclusion Lock (Mutex) Abstraction Layer

<p/>
<img src="https://nodei.co/npm/ipc-mutex.png?downloads=true&stars=true" alt=""/>

<p/>
<img src="https://david-dm.org/rse/ipc-mutex.png" alt=""/>

About
-----

This [Node.js](https://nodejs.org) module provides an abstraction layer
for Inter-Process-Communication through Mutual Exclusion Lock (Mutex). It
supports the following modes:

- Single-Process-Model (SPM):<br/>
  This is for Node applications NOT using the `cluster` module. The
  coordination is performed with an in-memory data structure. No
  external resource is needed.

- Multi-Process-Model (MPM):<br/>
  This is for Node applications using the `cluster` module. The
  coordination is performed with an in-memory data structure in the
  master process and an IPC message exchange between the worker
  processes and the master process with the help of the `cluster`
  module. No external resource is needed.

- Remote-Process-Model (RPM):<br/>
  This is for Node applications split into distinct processes (not
  created through the `cluster` module), usually running also on
  distinct machines. The coordination is performed with the help of an
  external database. Currently Redis is supported.

Installation
------------

```shell
$ npm install ipc-mutex --save-dev
```

Usage
-----

```js
(async () => {
    const Mutex = require("ipc-mutex")

    /*  open connection  */
    let mutex = new Mutex("spm:foo")
    await mutex.open()

    /*  acquire exclusive lock  */
    await mutex.acquire()

    /*  release exclusive lock  */
    await mutex.release()

    /*  close connection  */
    await mutex.close()
})
```

The following URLs are supported on `new Mutex(url)`:

- `spm:<id>`
- `mpm:<id>`
- `rpm+redis://[xxx:<secret>@]<host>[:<port>][/<id>]`

Application Programming Interface (API)
---------------------------------------

```ts
declare class KeyVal {
    constructor (url: string);
    open(): Promise<void>;
    acquire(): Promise<void>;
    release(): Promise<void>;
    close(): Promise<void>;
}
```

License
-------

Copyright (c) 2018 Ralf S. Engelschall (http://engelschall.com/)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

