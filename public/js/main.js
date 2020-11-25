const drums = require('./drummachine');
const code = require('./codeManager');

const initmod = require('./init');

window.onload = function(){
  var cmInstance = code.bootCodeMirror();
  exports.cmInstance = cmInstance;
  console.log(cmInstance)
  initmod.initDrums();
}
