const drums = require('./drummachine')
const beatProfs = require('./beatProfiles');
const irMod = require('./impulseResponse')
const kitMod = require('./kit')
const handlersMod = require('./handlers')

function startLoadingAssets() {
    irMod.impulseResponseList = new Array();

    for (i = 0; i < irMod.impulseResponseInfoList.length; i++) {
        irMod.impulseResponseList[i] = new irMod.ImpulseResponse(irMod.impulseResponseInfoList[i].url, i);
    }

    // Initialize drum kits
    var numKits = kitMod.kitName.length;
    kitMod.kits = new Array(numKits);
    for (var i  = 0; i < numKits; i++) {
        kitMod.kits[i] = new kitMod.Kit(kitMod.kitName[i]);
    }

    // Start loading the assets used by the presets first, in order of the presets.
    for (var demoIndex = 0; demoIndex < 5; ++demoIndex) {
        var effect = irMod.impulseResponseList[beatProfs.beatDemo[demoIndex].effectIndex];
        var kit = kitMod.kits[beatProfs.beatDemo[demoIndex].kitIndex];

        // These effects and kits will keep track of a particular demo, so we can change
        // the loading status in the UI.
        effect.setDemoIndex(demoIndex);
        kit.setDemoIndex(demoIndex);

        effect.load();
        kit.load();
    }

    // Then load the remaining assets.
    // Note that any assets which have previously started loading will be skipped over.
    for (var i  = 0; i < numKits; i++) {
        kitMod.kits[i].load();
    }

    // Start at 1 to skip "No Effect"
    for (i = 1; i < irMod.impulseResponseInfoList.length; i++) {
        irMod.impulseResponseList[i].load();
    }

    // Setup initial drumkit
    kitMod.currentKit = kitMod.kits[kitMod.kInitialKitIndex];
}

function demoButtonURL(demoIndex) {
    var n = demoIndex + 1;
    var demoName = "demo" + n;
    var url = "images/btn_" + demoName + ".png";
    return url;
}

// This gets rid of the loading spinner in each of the demo buttons.
function showDemoAvailable(demoIndex /* zero-based */) {
    var url = demoButtonURL(demoIndex);
    var n = demoIndex + 1;
    var demoName = "demo" + n;
    var demo = document.getElementById(demoName);
    demo.src = url;

    // Enable play button and assign it to demo 2.
    if (demoIndex == 1) {
        showPlayAvailable();
        drums.loadBeat(beatProfs.beatDemo[1]);

    // Uncomment to allow autoplay
    //     handlePlay();
    }
}

// This gets rid of the loading spinner on the play button.
function showPlayAvailable() {
    var play = document.getElementById("play");
    play.src = "images/btn_play.png";
}

exports.initDrums = function() {

    // Let the beat demos know when all of their assets have been loaded.
    // Add some new methods to support this.
    for (var i = 0; i < beatProfs.beatDemo.length; ++i) {
        beatProfs.beatDemo[i].index = i;
        beatProfs.beatDemo[i].isKitLoaded = false;
        beatProfs.beatDemo[i].isEffectLoaded = false;

        beatProfs.beatDemo[i].setKitLoaded = function() {
            this.isKitLoaded = true;
            this.checkIsLoaded();
        };

        beatProfs.beatDemo[i].setEffectLoaded = function() {
            this.isEffectLoaded = true;
            this.checkIsLoaded();
        };

        beatProfs.beatDemo[i].checkIsLoaded = function() {
            if (this.isLoaded()) {
                showDemoAvailable(this.index);
            }
        };

        beatProfs.beatDemo[i].isLoaded = function() {
            return this.isKitLoaded && this.isEffectLoaded;
        };
    }

    startLoadingAssets();

    // NOTE: THIS NOW RELIES ON THE MONKEYPATCH LIBRARY TO LOAD
    // IN CHROME AND SAFARI (until they release unprefixed)

    // drums.context = new AudioContext();
    drums.setContext(new AudioContext());

    var finalMixNode;
    if (drums.context.createDynamicsCompressor) {
        // Create a dynamics compressor to sweeten the overall mix.
        drums.compressor = drums.context.createDynamicsCompressor();
        drums.compressor.connect(drums.context.destination);
        finalMixNode = drums.compressor;
    } else {
        // No compressor available in this implementation.
        finalMixNode = drums.context.destination;
    }

    // create master filter node
    drums.filterNode = drums.context.createBiquadFilter();
    drums.filterNode.type = "lowpass";
    drums.filterNode.frequency.value = 0.5 * drums.context.sampleRate;
    drums.filterNode.Q.value = 1;
    drums.filterNode.connect(finalMixNode);

    // Create master volume.
    drums.masterGainNode = drums.context.createGain();
    drums.masterGainNode.gain.value = 0.7; // reduce overall volume to avoid clipping
    drums.masterGainNode.connect(drums.filterNode);

    // Create effect volume.
    drums.effectLevelNode = drums.context.createGain();
    drums.effectLevelNode.gain.value = 1.0; // effect level slider controls this
    drums.effectLevelNode.connect(drums.masterGainNode);

    // Create convolver for effect
    drums.convolver = drums.context.createConvolver();
    drums.convolver.connect(drums.effectLevelNode);


    var elKitCombo = document.getElementById('kitcombo');
    elKitCombo.addEventListener("mousedown", handlersMod.handleKitComboMouseDown, true);

    var elEffectCombo = document.getElementById('effectcombo');
    elEffectCombo.addEventListener("mousedown", handlersMod.handleEffectComboMouseDown, true);

    document.body.addEventListener("mousedown", handlersMod.handleBodyMouseDown, true);

    initControls();
    drums.updateControls();

    var timerWorkerBlob = new Blob([
        "var timeoutID=0;function schedule(){timeoutID=setTimeout(function(){postMessage('schedule'); schedule();},100);} onmessage = function(e) { if (e.data == 'start') { if (!timeoutID) schedule();} else if (e.data == 'stop') {if (timeoutID) clearTimeout(timeoutID); timeoutID=0;};}"]);

    // Obtain a blob URL reference to our worker 'file'.
    var timerWorkerBlobURL = window.URL.createObjectURL(timerWorkerBlob);

    // timerWorker = new Worker(timerWorkerBlobURL);
    drums.setTimerWorker(new Worker(timerWorkerBlobURL));
    drums.timerWorker.onmessage = function(e) {
      schedule();
    };
    drums.timerWorker.postMessage('init'); // Start the worker.

}

function initControls() {
    // Initialize note buttons
    initButtons();
    makeKitList();
    makeEffectList();

    // sliders
    document.getElementById('effect_thumb').addEventListener('mousedown', handlersMod.handleSliderMouseDown, true);
    document.getElementById('tom1_thumb').addEventListener('mousedown', handlersMod.handleSliderMouseDown, true);
    document.getElementById('tom2_thumb').addEventListener('mousedown', handlersMod.handleSliderMouseDown, true);
    document.getElementById('tom3_thumb').addEventListener('mousedown', handlersMod.handleSliderMouseDown, true);
    document.getElementById('hihat_thumb').addEventListener('mousedown', handlersMod.handleSliderMouseDown, true);
    document.getElementById('snare_thumb').addEventListener('mousedown', handlersMod.handleSliderMouseDown, true);
    document.getElementById('kick_thumb').addEventListener('mousedown', handlersMod.handleSliderMouseDown, true);
    document.getElementById('swing_thumb').addEventListener('mousedown', handlersMod.handleSliderMouseDown, true);

    document.getElementById('effect_thumb').addEventListener('dblclick', handlersMod.handleSliderDoubleClick, true);
    document.getElementById('tom1_thumb').addEventListener('dblclick', handlersMod.handleSliderDoubleClick, true);
    document.getElementById('tom2_thumb').addEventListener('dblclick', handlersMod.handleSliderDoubleClick, true);
    document.getElementById('tom3_thumb').addEventListener('dblclick', handlersMod.handleSliderDoubleClick, true);
    document.getElementById('hihat_thumb').addEventListener('dblclick', handlersMod.handleSliderDoubleClick, true);
    document.getElementById('snare_thumb').addEventListener('dblclick', handlersMod.handleSliderDoubleClick, true);
    document.getElementById('kick_thumb').addEventListener('dblclick', handlersMod.handleSliderDoubleClick, true);
    document.getElementById('swing_thumb').addEventListener('dblclick', handlersMod.handleSliderDoubleClick, true);

    // tool buttons
    document.getElementById('play').addEventListener('mousedown', handlersMod.handlePlay, true);
    document.getElementById('stop').addEventListener('mousedown', handlersMod.handleStop, true);
    document.getElementById('save').addEventListener('mousedown', handlersMod.handleSave, true);
    document.getElementById('save_ok').addEventListener('mousedown', handlersMod.handleSaveOk, true);
    document.getElementById('load').addEventListener('mousedown', handlersMod.handleLoad, true);
    document.getElementById('load_ok').addEventListener('mousedown', handlersMod.handleLoadOk, true);
    document.getElementById('load_cancel').addEventListener('mousedown', handlersMod.handleLoadCancel, true);
    document.getElementById('reset').addEventListener('mousedown', handlersMod.handleReset, true);
    document.getElementById('demo1').addEventListener('mousedown', handlersMod.handleDemoMouseDown, true);
    document.getElementById('demo2').addEventListener('mousedown', handlersMod.handleDemoMouseDown, true);
    document.getElementById('demo3').addEventListener('mousedown', handlersMod.handleDemoMouseDown, true);
    document.getElementById('demo4').addEventListener('mousedown', handlersMod.handleDemoMouseDown, true);
    document.getElementById('demo5').addEventListener('mousedown', handlersMod.handleDemoMouseDown, true);

    var elBody = document.getElementById('body');
    elBody.addEventListener('mousemove', handlersMod.handleMouseMove, true);
    elBody.addEventListener('mouseup', handlersMod.handleMouseUp, true);

    document.getElementById('tempoinc').addEventListener('mousedown', drums.tempoIncrease, true);
    document.getElementById('tempodec').addEventListener('mousedown', drums.tempoDecrease, true);
}

function initButtons() {
    var elButton;

    for (i = 0; i < drums.loopLength; ++i) {
        for (j = 0; j < drums.kNumInstruments; j++) {
                elButton = document.getElementById(drums.instruments[j] + '_' + i);
                elButton.addEventListener("mousedown", handlersMod.handleButtonMouseDown, true);
        }
    }
}

function makeEffectList() {
    var elList = document.getElementById('effectlist');
    var numEffects = irMod.impulseResponseInfoList.length;


    var elItem = document.createElement('li');
    elItem.innerHTML = 'None';
    elItem.addEventListener("mousedown", handlersMod.handleEffectMouseDown, true);

    for (var i = 0; i < numEffects; i++) {
        var elItem = document.createElement('li');
        elItem.innerHTML = irMod.impulseResponseInfoList[i].name;
        elList.appendChild(elItem);
        elItem.addEventListener("mousedown", handlersMod.handleEffectMouseDown, true);
    }
}

function makeKitList() {
    var elList = document.getElementById('kitlist');
    var numKits = kitMod.kitName.length;

    for (var i = 0; i < numKits; i++) {
        var elItem = document.createElement('li');
        elItem.innerHTML = kitMod.kitNamePretty[i];
        elList.appendChild(elItem);
        elItem.addEventListener("mousedown", handlersMod.handleKitMouseDown, true);
    }
}
