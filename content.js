// Create and inject UI elements
function createVoiceUI() {
    console.log('Creating voice UI elements...');
    const container = document.createElement('div');
    container.className = 'vosk-container';
    
    const button = document.createElement('button');
    button.id = 'vosk-trigger';
    button.textContent = '开启语音识别';
    button.className = 'vosk-button';
    
    const subtitles = document.createElement('div');
    subtitles.className = 'vosk-subtitles';
    
    const results = document.createElement('div');
    results.id = 'recognition-result';
    results.className = 'vosk-results';
    
    const partial = document.createElement('span');
    partial.id = 'partial';
    partial.className = 'vosk-partial';
    
    results.appendChild(partial);
    subtitles.appendChild(results);
    container.appendChild(button);
    container.appendChild(subtitles);
    document.body.appendChild(container);
    
    console.log('Voice UI elements created and injected');
    return {button, results, partial};
}

async function init() {
    console.log('Initializing voice recognition...');
    const {results: resultsContainer, partial: partialContainer} = createVoiceUI();

    partialContainer.textContent = "Loading...";
    console.log('Loading Vosk model...');
    
    let model;
    try {
        if (typeof Vosk === 'undefined') {
            throw new Error('Vosk library not loaded');
        }
        
        const modelPath = chrome.runtime.getURL('models/vosk-model-small-cn-0.22.zip');
        console.log('Loading model from:', modelPath);
        model = await Vosk.createModel(modelPath);
        console.log('Vosk model loaded successfully');
    } catch (error) {
        console.error('Failed to load Vosk model:', error);
        partialContainer.textContent = "错误: 无法加载语音模型";
        throw error;
    }

    const sampleRate = 16000;
    
    console.log('Requesting microphone access...');
    let mediaStream;
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                channelCount: 1,
                sampleRate
            },
        });
        console.log('Microphone access granted');
    } catch (error) {
        console.error('Failed to get microphone access:', error);
        partialContainer.textContent = "错误: 无法访问麦克风，请确保已授权";
        throw error;
    }
    
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(mediaStream);
    
    console.log('Creating Vosk recognizer...');
    const recognizer = new model.KaldiRecognizer(sampleRate);
    
    recognizer.on("result", (message) => {
        const result = message.result;
        console.log("Recognition result:", result);
        
        const newSpan = document.createElement('span');
        newSpan.textContent = `${result.text} `;
        resultsContainer.insertBefore(newSpan, partialContainer);
    });
    
    recognizer.on("partialresult", (message) => {
        const partial = message.result.partial;
        console.log("Partial result:", message.result);
        partialContainer.textContent = partial;
    });
    
    partialContainer.textContent = "Ready";
    console.log('Voice recognition ready');
    
    const recognizerNode = audioContext.createScriptProcessor(4096, 1, 1);
    recognizerNode.onaudioprocess = (event) => {
        try {
            const success = recognizer.acceptWaveform(event.inputBuffer);
            if (success) {
                console.log("Waveform accepted");
            }
        } catch (error) {
            console.error('acceptWaveform failed:', error);
        }
    };
    
    source.connect(recognizerNode);
    recognizerNode.connect(audioContext.destination); 
}

// Initialize immediately
console.log('Content script loaded');
window.addEventListener('load', () => {
    console.log('Window loaded, creating UI...');
    const {button} = createVoiceUI();
    button.addEventListener('click', () => {
        console.log('Voice recognition button clicked');
        button.disabled = true;
        button.textContent = '语音识别已开启';
        init().catch(error => {
            console.error("Initialization failed:", error);
            button.disabled = false;
            button.textContent = '开启语音识别';
        });
    });
});
