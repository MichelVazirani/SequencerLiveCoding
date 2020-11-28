const synthmod = require('./synthesis');
const initmod = require('./init');
const beat_profs = require('./beatProfiles');
const handlersMod = require('./handlers')
const kitMod = require('./kit')
const irMod = require('./impulseResponse')

// Events
// init() once the page has finished loading.
//window.onload = init;

var timerWorker = null; // Worker thread to send us scheduling messages.
var context;
var convolver;
var compressor;
var masterGainNode;
var effectLevelNode;
var filterNode;

// Each effect impulse response has a specific overall desired dry and wet volume.
// For example in the telephone filter, it's necessary to make the dry volume 0 to correctly hear the effect.
var effectDryMix = 1.0;
var effectWetMix = 1.0;

var timeoutId;

var startTime;
var lastDrawTime = -1;


var kMaxSwing = .08;





exports.setBeat = function(newBeat) {
    theBeat = newBeat
}

function cloneBeat(source) {
    var beat = new Object();

    beat.kitIndex = source.kitIndex;
    beat.effectIndex = source.effectIndex;
    beat.tempo = source.tempo;
    beat.swingFactor = source.swingFactor;
    beat.effectMix = source.effectMix;
    beat.kickPitchVal = source.kickPitchVal;
    beat.snarePitchVal = source.snarePitchVal;
    beat.hihatPitchVal = source.hihatPitchVal;
    beat.tom1PitchVal = source.tom1PitchVal;
    beat.tom2PitchVal = source.tom2PitchVal;
    beat.tom3PitchVal = source.tom3PitchVal;
    beat.rhythm1 = source.rhythm1.slice(0);        // slice(0) is an easy way to copy the full array
    beat.rhythm2 = source.rhythm2.slice(0);
    beat.rhythm3 = source.rhythm3.slice(0);
    beat.rhythm4 = source.rhythm4.slice(0);
    beat.rhythm5 = source.rhythm5.slice(0);
    beat.rhythm6 = source.rhythm6.slice(0);

    return beat;
}

function isValidBeat(beat) {

    var valid = true;
    for (i = 1; i <= 6; i++) {
        valid = valid &&
            Array.isArray(beat['rhythm'+i.toString()]) &&
            beat['rhythm'+i.toString()].every((v) => v <=2 && v >=0);
    }
    console.log(valid);
    return valid;
}

// theBeat is the object representing the current beat/groove
// ... it is saved/loaded via JSON
var theBeat = cloneBeat(beat_profs.beatReset);

kickPitch = snarePitch = hihatPitch = tom1Pitch = tom2Pitch = tom3Pitch = 0;


var loopLength = 16;
var rhythmIndex = 0;
var kMinTempo = 53;
var kMaxTempo = 180;
var noteTime = 0.0;

var instruments = ['Kick', 'Snare', 'HiHat', 'Tom1', 'Tom2', 'Tom3'];

var volumes = [0, 0.3, 1];



function advanceNote() {

    synthmod.updatePatternFromCode();

    // Advance time by a 16th note...
    var secondsPerBeat = 60.0 / theBeat.tempo;

    rhythmIndex++;
    if (rhythmIndex == loopLength) {
        rhythmIndex = 0;
    }

        // apply swing
    if (rhythmIndex % 2) {
        noteTime += (0.25 + kMaxSwing * theBeat.swingFactor) * secondsPerBeat;
    } else {
        noteTime += (0.25 - kMaxSwing * theBeat.swingFactor) * secondsPerBeat;
    }
}

function playNote(buffer, pan, x, y, z, sendGain, mainGain, playbackRate, noteTime) {
    // Create the note
    var voice = context.createBufferSource();
    voice.buffer = buffer;
    voice.playbackRate.value = playbackRate;

    // Optionally, connect to a panner
    var finalNode;
    if (pan) {
        var panner = context.createPanner();
        panner.panningModel = "HRTF";
        panner.setPosition(x, y, z);
        voice.connect(panner);
        finalNode = panner;
    } else {
        finalNode = voice;
    }

    // Connect to dry mix
    var dryGainNode = context.createGain();
    dryGainNode.gain.value = mainGain * effectDryMix;
    finalNode.connect(dryGainNode);
    dryGainNode.connect(masterGainNode);

    // Connect to wet mix
    var wetGainNode = context.createGain();
    wetGainNode.gain.value = sendGain;
    finalNode.connect(wetGainNode);
    wetGainNode.connect(convolver);

    voice.start(noteTime);
}

function schedule() {
    console.log(context)
    var currentTime = context.currentTime;

    // The sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
    currentTime -= startTime;

    while (noteTime < currentTime + 0.120) {
        // Convert noteTime to context time.
        var contextPlayTime = noteTime + startTime;

        // Kick
        if (theBeat.rhythm1[rhythmIndex] && instrumentActive[0]) {
            playNote(kitMod.currentKit.kickBuffer, false, 0,0,-2, 0.5, volumes[theBeat.rhythm1[rhythmIndex]] * 1.0, kickPitch, contextPlayTime);
        }

        // Snare
        if (theBeat.rhythm2[rhythmIndex] && instrumentActive[1]) {
            playNote(kitMod.currentKit.snareBuffer, false, 0,0,-2, 1, volumes[theBeat.rhythm2[rhythmIndex]] * 0.6, snarePitch, contextPlayTime);
        }

        // Hihat
        if (theBeat.rhythm3[rhythmIndex] && instrumentActive[2]) {
            // Pan the hihat according to sequence position.
            playNote(kitMod.currentKit.hihatBuffer, true, 0.5*rhythmIndex - 4, 0, -1.0, 1, volumes[theBeat.rhythm3[rhythmIndex]] * 0.7, hihatPitch, contextPlayTime);
        }

        // Toms
        if (theBeat.rhythm4[rhythmIndex] && instrumentActive[3]) {
            playNote(kitMod.currentKit.tom1, false, 0,0,-2, 1, volumes[theBeat.rhythm4[rhythmIndex]] * 0.6, tom1Pitch, contextPlayTime);
        }

        if (theBeat.rhythm5[rhythmIndex] && instrumentActive[4]) {
            playNote(kitMod.currentKit.tom2, false, 0,0,-2, 1, volumes[theBeat.rhythm5[rhythmIndex]] * 0.6, tom2Pitch, contextPlayTime);
        }

        if (theBeat.rhythm6[rhythmIndex] && instrumentActive[5]) {
            playNote(kitMod.currentKit.tom3, false, 0,0,-2, 1, volumes[theBeat.rhythm6[rhythmIndex]] * 0.6, tom3Pitch, contextPlayTime);
        }


        // Attempt to synchronize drawing time with sound
        if (noteTime != lastDrawTime) {
            lastDrawTime = noteTime;
            drawPlayhead((rhythmIndex + 15) % 16);
        }

        advanceNote();
    }
}

function playDrum(noteNumber, velocity) {
    switch (noteNumber) {
        case 0x24:
            playNote(kitMod.currentKit.kickBuffer,  false, 0,0,-2,  0.5, (velocity / 127), kickPitch,  0);
            break;
        case 0x26:
            playNote(kitMod.currentKit.snareBuffer, false, 0,0,-2,  1,   (velocity / 127), snarePitch, 0);
            break;
        case 0x28:
            playNote(kitMod.currentKit.hihatBuffer, true,  0,0,-1.0,1,   (velocity / 127), hihatPitch, 0);
            break;
        case 0x2d:
            playNote(kitMod.currentKit.tom1,        false, 0,0,-2,  1,   (velocity / 127), tom1Pitch,  0);
            break;
        case 0x2f:
            playNote(kitMod.currentKit.tom2,        false, 0,0,-2,  1,   (velocity / 127), tom2Pitch,  0);
            break;
        case 0x32:
            playNote(kitMod.currentKit.tom3,        false, 0,0,-2,  1,   (velocity / 127), tom3Pitch,  0);
            break;
        default:
            console.log("note:0x" + noteNumber.toString(16) );
    }
}


function tempoIncrease() {
    theBeat.tempo = Math.min(kMaxTempo, theBeat.tempo+4);
    document.getElementById('tempo').innerHTML = theBeat.tempo;
}

function tempoDecrease() {
    theBeat.tempo = Math.max(kMinTempo, theBeat.tempo-4);
    document.getElementById('tempo').innerHTML = theBeat.tempo;
}


function isDescendantOfId(el, id) {
    if (el.parentElement) {
        if (el.parentElement.id == id) {
            return true;
        } else {
            return isDescendantOfId(el.parentElement, id);
        }
    } else {
        return false;
    }
}

function loadBeat(beat) {
    // Check that assets are loaded.
    if (beat != beat_profs.beatReset && !beat.isLoaded())
        return false;

    handlersMod.handleStop();

    theBeat = cloneBeat(beat);
    kitMod.currentKit = kitMod.kits[theBeat.kitIndex];
    handlersMod.setEffect(theBeat.effectIndex);

    // apply values from sliders
    handlersMod.sliderSetValue('effect_thumb', theBeat.effectMix);
    handlersMod.sliderSetValue('kick_thumb', theBeat.kickPitchVal);
    handlersMod.sliderSetValue('snare_thumb', theBeat.snarePitchVal);
    handlersMod.sliderSetValue('hihat_thumb', theBeat.hihatPitchVal);
    handlersMod.sliderSetValue('tom1_thumb', theBeat.tom1PitchVal);
    handlersMod.sliderSetValue('tom2_thumb', theBeat.tom2PitchVal);
    handlersMod.sliderSetValue('tom3_thumb', theBeat.tom3PitchVal);
    handlersMod.sliderSetValue('swing_thumb', theBeat.swingFactor);

    updateControls();
    setActiveInstrument(0);

    return true;
}

function updateControls() {
    for (i = 0; i < loopLength; ++i) {
        for (j = 0; j < kitMod.kNumInstruments; j++) {
            switch (j) {
                case 0: notes = theBeat.rhythm1; break;
                case 1: notes = theBeat.rhythm2; break;
                case 2: notes = theBeat.rhythm3; break;
                case 3: notes = theBeat.rhythm4; break;
                case 4: notes = theBeat.rhythm5; break;
                case 5: notes = theBeat.rhythm6; break;
            }

            drawNote(notes[i], i, j);
        }
    }

    document.getElementById('kitname').innerHTML = kitMod.kitNamePretty[theBeat.kitIndex];
    document.getElementById('effectname').innerHTML = irMod.impulseResponseInfoList[theBeat.effectIndex].name;
    document.getElementById('tempo').innerHTML = theBeat.tempo;
    handlersMod.sliderSetPosition('swing_thumb', theBeat.swingFactor);
    handlersMod.sliderSetPosition('effect_thumb', theBeat.effectMix);
    handlersMod.sliderSetPosition('kick_thumb', theBeat.kickPitchVal);
    handlersMod.sliderSetPosition('snare_thumb', theBeat.snarePitchVal);
    handlersMod.sliderSetPosition('hihat_thumb', theBeat.hihatPitchVal);
    handlersMod.sliderSetPosition('tom1_thumb', theBeat.tom1PitchVal);
    handlersMod.sliderSetPosition('tom2_thumb', theBeat.tom2PitchVal);
    handlersMod.sliderSetPosition('tom3_thumb', theBeat.tom3PitchVal);
}

function drawNote(draw, xindex, yindex) {
    var elButton = document.getElementById(instruments[yindex] + '_' + xindex);
    switch (draw) {
        case 0: elButton.src = 'images/button_off.png'; break;
        case 1: elButton.src = 'images/button_half.png'; break;
        case 2: elButton.src = 'images/button_on.png'; break;
    }
}

function redrawAllNotes() {
    for (y = 0; y < 6; y++) { //6 rhythm patterns in theBeat
        for (x = 0; x < 16; x++)  { //16 beat subdivisions
            if(x >= theBeat['rhythm'+(y+1).toString()].length){
                drawNote(0, x, y);
            }
            else {
                drawNote(theBeat['rhythm'+(y+1).toString()][x], x, y);
            }
        }
    }
}

function drawPlayhead(xindex) {
    var lastIndex = (xindex + 15) % 16;

    var elNew = document.getElementById('LED_' + xindex);
    var elOld = document.getElementById('LED_' + lastIndex);

    elNew.src = 'images/LED_on.png';
    elOld.src = 'images/LED_off.png';

    hideBeat( lastIndex );
    showBeat( xindex );
}

function filterFrequencyFromCutoff( cutoff ) {
    var nyquist = 0.5 * context.sampleRate;

    // spreads over a ~ten-octave range, from 20Hz - 20kHz.
    var filterFrequency = Math.pow(2, (11 * cutoff)) * 40;

    if (filterFrequency > nyquist)
        filterFrequency = nyquist;
    return filterFrequency;
}

function setFilterCutoff( cutoff ) {
    if (filterNode)
        filterNode.frequency.value = filterFrequencyFromCutoff( cutoff );
}

function setFilterQ( Q ) {
    if (filterNode)
        filterNode.Q.value = Q;
}



function setContext(c) {
    context = c
}

function setTimerWorker(t) {
    timerWorker = t
}


// exports.printContext = printContext
exports.setContext = setContext

exports.context = context
exports.effectDryMix = effectDryMix
exports.effectWetMix = effectWetMix
exports.convolver = convolver
exports.compressor = compressor
exports.masterGainNode = masterGainNode
exports.effectLevelNode = effectLevelNode
exports.filterNode = filterNode


exports.timerWorker = timerWorker
exports.startTime = startTime
exports.loopLength = loopLength
exports.tempoIncrease = tempoIncrease
exports.tempoDecrease = tempoDecrease
exports.updateControls = updateControls
exports.loadBeat = loadBeat
exports.loopLength = loopLength
exports.rhythmIndex = rhythmIndex
exports.kMinTempo = kMinTempo
exports.kMaxTempo = kMaxTempo
exports.noteTime = noteTime
exports.instruments = instruments
exports.volumes = volumes
exports.theBeat = theBeat



exports.schedule = schedule
exports.drawNote = drawNote


//
