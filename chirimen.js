#!/usr/bin/env node
var gpio = require("gpio");
var fs = require('fs');
var PORT_ASSIGN = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
console.log(PORT_ASSIGN);

var GPIOPort = [];
//pin assign from chirimen to raspberry pi
/*
{
  DEVICE:"Raspberry pi",
  PORTS: {
    283: 4,  //pullup
    284: 17, //pulldown
    196: 5,  //pullup
    197: 27, //pulldown
    198: 6,  //pullup
    199: 8,  //pullup
    244: 22, //pulldown
    243: 10,  //pulldown
    246: 9,  //pulldown
    245: 11, //pulldown
    163: 13, //pulldown
    193: 19, //pulldown
    192: 7,  //pullup
    353: 12,  //pullup
  }
}
*/

var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

var connection;

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

var buf2jsonNode = (dataBuffer) => JSON.parse(dataBuffer.toString('utf-16le'));
//var json2bufNode = (jsonData) => Buffer.from(JSON.stringify(jsonData),'utf-16le');
var json2bufNode = (jsonData) => JSON.stringify(jsonData);
/*var json2bufNode = (jsonData) => {
  var strJson = JSON.stringify(jsonData);
  var buf = new ArrayBuffer(strJson.length * 2);
  var uInt8Array = new Uint16Array(buf);
  for (var i = 0, strLen = strJson.length; i < strLen; i++) {
    uInt8Array[i] = strJson.charCodeAt(i);
  }

  return uInt8Array;
};*/

wsServer.on('request', function(request) {
  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject();
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
    return;
  }

  connection = request.accept('echo-protocol', request.origin);
  console.log((new Date()) + ' Connection accepted.');
  connection.on('message', function(message) {
      if (message.type === 'utf8') {
          console.log('Received Message: ' + message.utf8Data);
      }
      else if (message.type === 'binary') {
          console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');

          var data = buf2jsonNode(message.binaryData);
          console.log(data);
          gpioOnMessage(data);

      }
  });
  connection.on('close', function(reasonCode, description) {
      console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
      // clear
      GPIOPort.forEach(port=>{port.removeAllListeners("change");});
      GPIOPort = [];
  });
});

function gpioOnMessage(data){

  switch(data.method){
    case 'gpio.export':
      GPIOPort[data.portNumber] = gpio.export(PORT_ASSIGN.PORTS[data.portNumber],{
        direction: 'out',
        ready: function(){
          connection.sendUTF(json2bufNode({
            method: `${data.method}.${data.portNumber}`,
            portNumber: data.portNumber,
          }));
        }
      });
      break;
    case 'gpio.setDirection':
      var direction = data.direction ? 'out' : 'in';
      GPIOPort[data.portNumber] = gpio.export(PORT_ASSIGN.PORTS[data.portNumber],{
        direction: direction,
        ready: function(){
          if (!data.direction) {
            GPIOPort[data.portNumber].on("change", function(value) {
               // value will report either 1 or 0 (number) when the value changes
               console.log(value);
               connection.sendUTF(json2bufNode({
                 method: `gpio.onchange.${data.portNumber}`,
                 portNumber: data.portNumber,
                 value: value,
               }));
            });
          }else{
            GPIOPort[data.portNumber].removeAllListeners("change");
          }
          connection.sendUTF(json2bufNode({
            method: `${data.method}.${data.portNumber}`,
            portNumber: data.portNumber,
          }));
        }
      });
      break;
    case 'gpio.setValue':
      GPIOPort[data.portNumber].set(data.value);
      connection.sendUTF(json2bufNode({
        method: `${data.method}.${data.portNumber}`,
        portNumber: data.portNumber,
        value: data.value,
      }));
      break;
    case 'gpio.getValue':
      Promise.resolve(GPIOPort[data.portNumber].value).then((value)=> {
        console.log(value);
        connection.sendUTF(json2bufNode({
          method: `${data.method}.${data.portNumber}`,
          portNumber: data.portNumber,
          value: value,
        }));
      });
      break;
    default:
      throw 'Unexpected case to worker method';
  }

}
