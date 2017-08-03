# Prototype of WebGPIO polyfill for node backend
This is a prototype of WebGPIO polyfill for node backend. Please see also [this issue](https://github.com/chirimen-oh/any-issues/issues/188) and [WebGPIO polyfill](https://github.com/chirimen-oh/polyfills/).

## HOW TO USE (for Raspberry pi 3)

* Prepare a SD card of Rasbian OS (see [here](https://www.raspberrypi.org/documentation/installation/installing-images/README.md))
* Install firefox browser

```
$ sudo apt-get install firefox-esr
```
* Install node.js

```
$ git clone git://github.com/creationix/nvm.git ~/.nvm
$ source ~/.nvm/nvm.sh
$ nvm install v6.11.2
$ nvm alias default v6.11.2
```

* Install polyfill

```
$ git clone https://github.com/naokisekiguchi/nodegpio.git
$ cd nodegpio
$ npm install
```

* Launch app

```
$ npm start blink
```

Then, node backend will start and launch LED blink application ( turn on/off gpio6 on Rpi3 every secound ) by firefox browser.

And also,
* `npm start button` command will launch button app.
* `npm start test` command will launch gpio test app which is to set gpio6 to HIGH and soon set it to LOW. It's to test response speed of setting gpio value.
* `npm start` command just launch only node backend.

### Pin assgin CHIRIMEN to other device

Please edit a config.json to set pin assign.

```
{
  "DEVICE":"Raspberry pi",
  "PORTS": {
    // CHIRIMEN pin : other device pin
    "283": 4,
    "284": 17,
     :
  }
}
```

## ISSUES
* Currently, there is a delay of 1.5 to 2 times compared with CHIRIMEN board.
* How define the pin assign to other devices.
  * CHIRIMEN has 6 pullup gpio pins but Rpi3 has only 5 pullup gpio pins.

## LICENSE

Copyright (c) 2017 CHIRIMEN Open Hardware

Licensed under the MIT License
