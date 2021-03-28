const beatMod = require('./beat')
const kitMod = require('./kit')
const drawMod = require('./draw')
const synthMod = require('./synthesis')
const playMod = require('./play')

var port;
var textEncoder;
var writableStreamClosed;
var writer;


async function configure() {
  //TESTING FEATHER STUFF

  if ("serial" in navigator) {
    // The Web Serial API is supported.
    console.log("serial")

    // Prompt user to select any serial port.
    port = await navigator.serial.requestPort();
    console.log(port.getInfo())

    try {await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none"});
    } catch (e) {console.log(e)}

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();

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

        activateNote(elID);
      }

    }
  }
}



function drawNote(newNoteValue, rhythmIndex, instrumentIndex) {
    console.log(newNoteValue)
    console.log(rhythmIndex)
    console.log(instrumentIndex)
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

    // if (newNoteValue) {
    //     switch(instrumentIndex) {
    //     case 0:  // Kick
    //       playMod.playNote(kitMod.currentKit.kickBuffer, false, 0,0,-2, 0.5 * beatMod.theBeat.effectMix, kitMod.volumes[newNoteValue] * 1.0, kitMod.kickPitch, 0);
    //       break;
    //
    //     case 1:  // Snare
    //       playMod.playNote(kitMod.currentKit.snareBuffer, false, 0,0,-2, beatMod.theBeat.effectMix, kitMod.volumes[newNoteValue] * 0.6, kitMod.snarePitch, 0);
    //       break;
    //
    //     case 2:  // Hihat
    //       // Pan the hihat according to sequence position.
    //       playMod.playNote(kitMod.currentKit.hihatBuffer, true, 0.5*rhythmIndex - 4, 0, -1.0, beatMod.theBeat.effectMix, kitMod.volumes[newNoteValue] * 0.7, kitMod.hihatPitch, 0);
    //       break;
    //
    //     case 3:  // Tom 1
    //       playMod.playNote(kitMod.currentKit.tom1, false, 0,0,-2, beatMod.theBeat.effectMix, kitMod.volumes[newNoteValue] * 0.6, kitMod.tom1Pitch, 0);
    //       break;
    //
    //     case 4:  // Tom 2
    //       playMod.playNote(kitMod.currentKit.tom2, false, 0,0,-2, beatMod.theBeat.effectMix, kitMod.volumes[newNoteValue] * 0.6, kitMod.tom2Pitch, 0);
    //       break;
    //
    //     case 5:  // Tom 3
    //       playMod.playNote(kitMod.currentKit.tom3, false, 0,0,-2, beatMod.theBeat.effectMix, kitMod.volumes[newNoteValue] * 0.6, kitMod.tom3Pitch, 0);
    //       break;
    //     }
    // }

    synthMod.synthCode(newNoteValue, rhythmIndex, instrumentIndex, beatMod.theBeat)
}






//functions

exports.configure = configure;
