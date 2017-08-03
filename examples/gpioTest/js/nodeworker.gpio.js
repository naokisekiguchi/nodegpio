(function(){/* istanbul ignore next */

NodeOvserve = (function () {

  function Ovserve() {
    this._Map = new Map();
  }

  // set ovserver
  Ovserve.prototype.observe = function (name, fnc) {
    var funcs = this._Map.get(name) || [];
    funcs.push(fnc);
    this._Map.set(name, funcs);
  };

  // remove ovserver
  Ovserve.prototype.unobserve = function (name, func) {
    var funcs = this._Map.get(name) || [];
    this._Map.set(name, funcs.filter(function (_func) {
      return _func !== func;
    }));
  };

  // notify ovserve
  Ovserve.prototype.notify = function (name) {
    var args = Array.prototype.slice.call(arguments, 1);
    /* istanbul ignore next */
    (this._Map.get(name) || []).forEach(function (func, index) {
      func.apply(null, args);
    });
  };

  // delete map
  // delete
  Ovserve.prototype.delete = function (name) {
    this._Map.delete(name);
  };

  return new Ovserve();
})();

var chirimenNode;

function connectNode(){
  return new Promise(function(resolve,reject){
    chirimenNode = new WebSocket('ws://localhost:8080/',['echo-protocol','soap', 'xmpp']);
    chirimenNode.onopen = function() {//WS接続確立

      NodeOvserve.observe('gpio', function (jsonData) {
        var ab = json2abWorker(jsonData);
        chirimenNode.send(ab.buffer, [ab.buffer]);
      });

      chirimenNode.onmessage = function (e) {
        console.log(e.data);
        var data = JSON.parse(e.data);
        //var data = ab2jsonWorker(e.data);
        NodeOvserve.notify(data.method, data);
      };


      nodeMozGPIO();
      resolve();
    };
    chirimenNode.onerror = function (error) {
      defaultMozGpio();
      reject();
    };
  })
}

function nodeMozGPIO(){
  navigator.mozGpio = new Object();
  navigator.mozGpio.direction = '';
  navigator.mozGpio.value = 0;
  navigator.mozGpio.export = function (portno) {
    console.log('export(' + portno + ')');
    NodeOvserve.notify('gpio',{
      method: 'gpio.export',
      portNumber: portno
    });
  };

  navigator.mozGpio.unexport = function (portno) {
  };

  navigator.mozGpio.setValue = function (portno, value) {
    return new Promise((resolve,reject)=>{
      console.log('setValue(' + portno + ',' + value + ')');
      NodeOvserve.observe(`gpio.setValue.${portno}`, (nodeData) => {
        resolve(nodeData.value);
      });

      NodeOvserve.notify('gpio',{
        method: 'gpio.setValue',
        portNumber: portno,
        value: value
      });
    });
  };

  navigator.mozGpio.getValue = function (portno) {
    return new Promise((resolve,reject)=>{
      NodeOvserve.observe(`gpio.getValue.${portno}`, (nodeData) => {
        resolve(nodeData.value);
      });

      NodeOvserve.notify('gpio', {
        method: 'gpio.getValue',
        portNumber: portno
      });
    });
  };

  navigator.mozGpio.setDirection = function (portno, direction) {
    console.log("mozgpio node setdirection");
    return new Promise((resolve,reject)=>{
      console.log('setDirection(' + portno + ',' + direction + ')');
      NodeOvserve.observe(`gpio.setDirection.${portno}`, () => {
        console.log('resolve setDirection(' + portno + ',' + direction + ')');
        resolve();
      });

      NodeOvserve.notify('gpio',{
        method: 'gpio.setDirection',
        portNumber: portno,
        direction: direction
      });
      navigator.mozGpio.direction = direction;
    });
  };

  navigator.mozGpio.getDirection = function () {
    return navigator.mozGpio.direction;
  };

}

function defaultMozGpio(){
  navigator.mozGpio = new Object();
  navigator.mozGpio.direction = '';
  navigator.mozGpio.value = 0;
  navigator.mozGpio.export = function (portno) {
  };

  navigator.mozGpio.unexport = function (portno) {
  };

  navigator.mozGpio.setValue = function (portno, value) {
    console.log('setValue(' + portno + ',' + value + ')');
  };

  navigator.mozGpio.getValue = function (portNumber) {
    return navigator.mozGpio.value;
  };

  navigator.mozGpio.setDirection = function (portno, direction) {
    console.log('setDirection(' + portno + ',' + direction + ')');
    navigator.mozGpio.direction = direction;
  };

  navigator.mozGpio.getDirection = function () {
    return navigator.mozGpio.direction;
  };

  // x秒おきに値を変更する
  // onchange event test
  // setInterval(()=> {
  //   navigator.mozGpio.value = navigator.mozGpio.value ? 0 : 1;
  //   console.log('navigator.mozGpio.value change', navigator.mozGpio.value);
  // }, 10000);
}

/**
* gpio監視イベント
**/
var onChangeIntervalEvent = ()=> {

  intervalPortList.forEach(port=> {
    Promise.resolve(navigator.mozGpio.getValue(port.portNumber)).then((value)=> {
      if (parseInt(port.value) !== parseInt(value)) {
        port.value = value;
        postMessage(json2abWorker({ method: `gpio.onchange.${port.portNumber}`, portNumber: port.portNumber, value: value, }));
      }
    });
  });

};

var intervalPortList = [];

var onchangeIntervalId = setInterval(onChangeIntervalEvent, 30);
onmessage = gpioOnMessage;

function gpioOnMessage(e) {
  var data = ab2jsonWorker(e.data);
  switch (data.method) {
    /********************************/
    /**         GPIO                */
    /********************************/
    case 'gpio.requestGPIOAccess':
      if (!navigator.mozGpio) {
        connectNode().then( ()=>{
          clearInterval(onchangeIntervalId);

          postMessage(json2abWorker({
            method: `${data.method}`,
            value: true
          }));
        },()=>{
          postMessage(json2abWorker({
            method: `${data.method}`,
            value: false
          }));
        });
      }else{
        postMessage(json2abWorker({
          method: `${data.method}`,
          value: true
        }));
      }
      break;
    case 'gpio.export':
      //thenで返していない
      navigator.mozGpio.export(data.portNumber);
      postMessage(json2abWorker({
        method: `${data.method}.${data.portNumber}`,
        portNumber: data.portNumber,
      }));
      break;
    case 'gpio.setDirection':
      navigator.mozGpio.setDirection(data.portNumber, data.direction);

      const time = 30;
      const d1 = new Date();
      while (true) {
          const d2 = new Date();
          if (d2 - d1 > time) {
              break;
          }
      }

      if (!data.direction) {
        intervalPortList.push({
          portNumber: data.portNumber,
          value: void 0,
        });
        NodeOvserve.observe(`gpio.onchange.${data.portNumber}`, function (nodeData) {
          console.log("node onchange");
          postMessage(json2abWorker({ method: nodeData.method, portNumber: nodeData.portNumber, value: nodeData.value, }));
        });
      } else {
        intervalPortList = intervalPortList.filter((v) => data.portNumber !== v.portNumber);
      }

      break;
    case 'gpio.setValue':
      Promise.resolve(navigator.mozGpio.setValue(data.portNumber, data.value)).then((value)=>{
        postMessage(json2abWorker({
          method: `${data.method}.${data.portNumber}`,
          portNumber: data.portNumber,
          value: value,
        }));
      });
      break;
    case 'gpio.getValue':
      Promise.resolve(navigator.mozGpio.getValue(data.portNumber)).then((value)=> {

        postMessage(json2abWorker({
          method: `${data.method}.${data.portNumber}`,
          portNumber: data.portNumber,
          value: value,
        }));
      });
      break;
    default:
      throw 'Unexpected case to worker method';
  }
};

var ab2jsonWorker = (dataBuffer) => JSON.parse(String.fromCharCode.apply(null, new Uint16Array(dataBuffer)));
var json2abWorker = (jsonData) => {
  var strJson = JSON.stringify(jsonData);
  var buf = new ArrayBuffer(strJson.length * 2);
  var uInt8Array = new Uint16Array(buf);
  for (var i = 0, strLen = strJson.length; i < strLen; i++) {
    uInt8Array[i] = strJson.charCodeAt(i);
  }

  return uInt8Array;
};
})()
