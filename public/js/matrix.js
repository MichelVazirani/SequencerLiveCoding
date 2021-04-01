const beatMod = require('./beat')
const kitMod = require('./kit')
const drawMod = require('./draw')
const synthMod = require('./synthesis')
const playMod = require('./play')

var port;
var textEncoder;
var writableStreamClosed;
var writer;
var configured = false;

var textDecoder;
var readableStreamClosed;
var reader;

async function configure() {
  //TESTING FEATHER STUFF

  if ("serial" in navigator) {
    // The Web Serial API is supported.
    console.log("serial")

    // Prompt user to select any serial port.
    port = await navigator.serial.requestPort();
    console.log(port.getInfo())

    try {
      await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none"});
      exports.port = port;
    } catch (e) {
      console.log(e)
    }

    textDecoder = new TextDecoderStream();
    readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    if (!textEncoder) {
      textEncoder = new TextEncoderStream();
      writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
      writer = textEncoder.writable.getWriter();
    }

    updateFullGrid()
    readLoop()
  }
}



async function readLoop() {
  var command;
  var elID;
  var beatNum;

  // Listen to data coming from the serial device.
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      // Allow the serial port to be closed later.
      reader.releaseLock();
      break;
    }
    // value is a string.
    console.log(value);
    command = value.split(" ");

    if (command[0] === "bp") {

      elID = "";
      if (command[2] < 2) {
        elID += "Tom1_";
      } else if (command[2] >= 2 && command[2] < 4) {
        elID += "HiHat_";
      } else if (command[2] >= 4 && command[2] < 6) {
        elID += "Snare_";
      } else if (command[2] >= 6) {
        elID += "Kick_";
      }

      beatNum = ((command[2]%2)*8) + parseInt(command[1]);
      elID += beatNum.toString();


      if (elID !== "NaN")
        activateNote(elID);
    }

  }
}



function activateNote(elId) {
    var notes = beatMod.theBeat.rhythm1;

    var instrumentIndex;
    var rhythmIndex;

    rhythmIndex = elId.substr(elId.indexOf('_') + 1, 2);
    instrumentIndex = kitMod.instruments.indexOf(elId.substr(0, elId.indexOf('_')));

    switch (instrumentIndex) {
        case 0: notes = beatMod.theBeat.rhythm1; break;
        case 1: notes = beatMod.theBeat.rhythm2; break;
        case 2: notes = beatMod.theBeat.rhythm3; break;
        case 3: notes = beatMod.theBeat.rhythm4; break;
        case 4: notes = beatMod.theBeat.rhythm5; break;
        case 5: notes = beatMod.theBeat.rhythm6; break;
    }

    var newNoteValue = (notes[rhythmIndex] + 1) % 3;

    notes[rhythmIndex] = newNoteValue

    if (instrumentIndex == currentlyActiveInstrument)
        showCorrectNote( rhythmIndex, notes[rhythmIndex] );

    drawMod.drawNote(notes[rhythmIndex], rhythmIndex, instrumentIndex);
    synthMod.synthCode(newNoteValue, rhythmIndex, instrumentIndex, beatMod.theBeat)
    drawNote(notes[rhythmIndex], rhythmIndex, instrumentIndex);
}


function drawNote(newNoteValue, rhythmIndex, instrumentIndex) {

    if (instrumentIndex < 4) {
      var y_base = ((-2)*instrumentIndex) + 6
      var y = y_base + Math.floor(rhythmIndex/8);
      var x = rhythmIndex % 8;

      var data = "light " + x.toString() + " " + y.toString() + " " + newNoteValue.toString() + "\r\n";

      writer.write(data);
    }
}

function updateFullGrid() {
  var notes;
  for (inst = 0; inst < 4; inst++){
    switch (inst) {
        case 0: notes = beatMod.theBeat.rhythm1; break;
        case 1: notes = beatMod.theBeat.rhythm2; break;
        case 2: notes = beatMod.theBeat.rhythm3; break;
        case 3: notes = beatMod.theBeat.rhythm4; break;
    }
    for (rhythm = 0; rhythm < 16; rhythm++) {
        drawNote(notes[rhythm], rhythm, inst);
    }
  }
}

function blinkNote(rhythmIndex, instrumentIndex) {
    console.log("blinking")
    if (instrumentIndex < 4) {
      var y_base = ((-2)*instrumentIndex) + 6
      var y = y_base + Math.floor(rhythmIndex/8);
      var x = rhythmIndex % 8;

      var data = "blink " + x.toString() + " " + y.toString() + "\r\n";

      console.log("data:", data)

      writer.write(data);
    }
}


function drawPlayhead(xindex) {
  for (inst = 0; inst < 4; inst++){
    switch (inst) {
        case 0: notes = beatMod.theBeat.rhythm1; break;
        case 1: notes = beatMod.theBeat.rhythm2; break;
        case 2: notes = beatMod.theBeat.rhythm3; break;
        case 3: notes = beatMod.theBeat.rhythm4; break;
    }
    if (notes[xindex] === 0) {
      blinkNote(xindex, inst)
    }
    var lastIndex = (xindex + 15) % 16;
    // await drawNote(notes[lastIndex], lastIndex, inst);
  }
}



//variables
exports.port = port;


//functions

exports.configure = configure;
exports.drawNote = drawNote;
exports.drawPlayhead = drawPlayhead;
