const drums = require('./drummachine')
const beatProfs = require('./beatProfiles');
const irMod = require('./impulseResponse')
const kitMod = require('./kit')

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
        loadBeat(beatProfs.beatDemo[1]);

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
    context = new AudioContext();

    var finalMixNode;
    if (context.createDynamicsCompressor) {
        // Create a dynamics compressor to sweeten the overall mix.
        compressor = context.createDynamicsCompressor();
        compressor.connect(context.destination);
        finalMixNode = compressor;
    } else {
        // No compressor available in this implementation.
        finalMixNode = context.destination;
    }

    // create master filter node
    filterNode = context.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.value = 0.5 * context.sampleRate;
    filterNode.Q.value = 1;
    filterNode.connect(finalMixNode);

    // Create master volume.
    masterGainNode = context.createGain();
    masterGainNode.gain.value = 0.7; // reduce overall volume to avoid clipping
    masterGainNode.connect(filterNode);

    // Create effect volume.
    effectLevelNode = context.createGain();
    effectLevelNode.gain.value = 1.0; // effect level slider controls this
    effectLevelNode.connect(masterGainNode);

    // Create convolver for effect
    convolver = context.createConvolver();
    convolver.connect(effectLevelNode);


    var elKitCombo = document.getElementById('kitcombo');
    elKitCombo.addEventListener("mousedown", handleKitComboMouseDown, true);

    var elEffectCombo = document.getElementById('effectcombo');
    elEffectCombo.addEventListener("mousedown", handleEffectComboMouseDown, true);

    document.body.addEventListener("mousedown", handleBodyMouseDown, true);

    initControls();
    updateControls();

    var timerWorkerBlob = new Blob([
        "var timeoutID=0;function schedule(){timeoutID=setTimeout(function(){postMessage('schedule'); schedule();},100);} onmessage = function(e) { if (e.data == 'start') { if (!timeoutID) schedule();} else if (e.data == 'stop') {if (timeoutID) clearTimeout(timeoutID); timeoutID=0;};}"]);

    // Obtain a blob URL reference to our worker 'file'.
    var timerWorkerBlobURL = window.URL.createObjectURL(timerWorkerBlob);

    timerWorker = new Worker(timerWorkerBlobURL);
    timerWorker.onmessage = function(e) {
      schedule();
    };
    timerWorker.postMessage('init'); // Start the worker.

}

function initControls() {
    // Initialize note buttons
    initButtons();
    makeKitList();
    makeEffectList();

    // sliders
    document.getElementById('effect_thumb').addEventListener('mousedown', handleSliderMouseDown, true);
    document.getElementById('tom1_thumb').addEventListener('mousedown', handleSliderMouseDown, true);
    document.getElementById('tom2_thumb').addEventListener('mousedown', handleSliderMouseDown, true);
    document.getElementById('tom3_thumb').addEventListener('mousedown', handleSliderMouseDown, true);
    document.getElementById('hihat_thumb').addEventListener('mousedown', handleSliderMouseDown, true);
    document.getElementById('snare_thumb').addEventListener('mousedown', handleSliderMouseDown, true);
    document.getElementById('kick_thumb').addEventListener('mousedown', handleSliderMouseDown, true);
    document.getElementById('swing_thumb').addEventListener('mousedown', handleSliderMouseDown, true);

    document.getElementById('effect_thumb').addEventListener('dblclick', handleSliderDoubleClick, true);
    document.getElementById('tom1_thumb').addEventListener('dblclick', handleSliderDoubleClick, true);
    document.getElementById('tom2_thumb').addEventListener('dblclick', handleSliderDoubleClick, true);
    document.getElementById('tom3_thumb').addEventListener('dblclick', handleSliderDoubleClick, true);
    document.getElementById('hihat_thumb').addEventListener('dblclick', handleSliderDoubleClick, true);
    document.getElementById('snare_thumb').addEventListener('dblclick', handleSliderDoubleClick, true);
    document.getElementById('kick_thumb').addEventListener('dblclick', handleSliderDoubleClick, true);
    document.getElementById('swing_thumb').addEventListener('dblclick', handleSliderDoubleClick, true);

    // tool buttons
    document.getElementById('play').addEventListener('mousedown', handlePlay, true);
    document.getElementById('stop').addEventListener('mousedown', handleStop, true);
    document.getElementById('save').addEventListener('mousedown', handleSave, true);
    document.getElementById('save_ok').addEventListener('mousedown', handleSaveOk, true);
    document.getElementById('load').addEventListener('mousedown', handleLoad, true);
    document.getElementById('load_ok').addEventListener('mousedown', handleLoadOk, true);
    document.getElementById('load_cancel').addEventListener('mousedown', handleLoadCancel, true);
    document.getElementById('reset').addEventListener('mousedown', handleReset, true);
    document.getElementById('demo1').addEventListener('mousedown', handleDemoMouseDown, true);
    document.getElementById('demo2').addEventListener('mousedown', handleDemoMouseDown, true);
    document.getElementById('demo3').addEventListener('mousedown', handleDemoMouseDown, true);
    document.getElementById('demo4').addEventListener('mousedown', handleDemoMouseDown, true);
    document.getElementById('demo5').addEventListener('mousedown', handleDemoMouseDown, true);

    var elBody = document.getElementById('body');
    elBody.addEventListener('mousemove', handleMouseMove, true);
    elBody.addEventListener('mouseup', handleMouseUp, true);

    document.getElementById('tempoinc').addEventListener('mousedown', tempoIncrease, true);
    document.getElementById('tempodec').addEventListener('mousedown', tempoDecrease, true);
}

function initButtons() {
    var elButton;

    for (i = 0; i < loopLength; ++i) {
        for (j = 0; j < drums.kNumInstruments; j++) {
                elButton = document.getElementById(instruments[j] + '_' + i);
                elButton.addEventListener("mousedown", handleButtonMouseDown, true);
        }
    }
}

function makeEffectList() {
    var elList = document.getElementById('effectlist');
    var numEffects = irMod.impulseResponseInfoList.length;


    var elItem = document.createElement('li');
    elItem.innerHTML = 'None';
    elItem.addEventListener("mousedown", handleEffectMouseDown, true);

    for (var i = 0; i < numEffects; i++) {
        var elItem = document.createElement('li');
        elItem.innerHTML = irMod.impulseResponseInfoList[i].name;
        elList.appendChild(elItem);
        elItem.addEventListener("mousedown", handleEffectMouseDown, true);
    }
}

function makeKitList() {
    var elList = document.getElementById('kitlist');
    var numKits = kitName.length;

    for (var i = 0; i < numKits; i++) {
        var elItem = document.createElement('li');
        elItem.innerHTML = kitNamePretty[i];
        elList.appendChild(elItem);
        elItem.addEventListener("mousedown", handleKitMouseDown, true);
    }
}
