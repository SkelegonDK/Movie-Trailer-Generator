import { create } from 'zustand'
import { getApiClientAsync } from './api-client'
import { createAudioBlob, saveAudioTrack, convertAudioBufferToWavArrayBuffer, mixVoiceoverAndMusic, AudioTrack } from '@/lib/audio-utils'
import { stretchMusicToVoiceover } from './time-stretch'
import { BACKGROUND_MUSIC_TRACKS } from './audio-assets'
import { DEFAULT_CAPTION_STYLE, CaptionStyle } from './caption-style'
import { DEFAULT_PARAMETER_MODE, getGenerationContext, type MovieParameters, type ParameterMode } from './parameter-modes'

interface AppState {
  parameters: MovieParameters
  movieTitle: string
  customContextEnabled: boolean
  customContext: string
  isProcessingContext: boolean
  contextFieldsVisible: boolean
  currentScript: string
  posterData: any | null
  posterDataError: string | null
  isGenerating: boolean
  isGeneratingAudio: boolean
  audioGenerationStatus: {
    show: boolean
    status: "generating" | "success" | "error"
    message: string
    audioUrl?: string
  }
  mode: ParameterMode
  posterStatus: 'idle' | 'loading' | 'ready'
  posterUrl: string | null
  trailerAudioBuffer: AudioBuffer | null
  captionStyle: CaptionStyle
  videoGenerationStatus: {
    show: boolean
    status: "idle" | "generating" | "success" | "error"
    message: string
    progress: number
    videoUrl?: string
    videoExtension?: string
  }
  isGeneratingVideo: boolean

  setParameters: (parameters: MovieParameters) => void
  setMovieTitle: (title: string) => void
  setCustomContextEnabled: (enabled: boolean) => void
  setCustomContext: (context: string) => void
  setCurrentScript: (script: string) => void
  setPosterData: (data: any | null) => void
  setPosterDataError: (error: string | null) => void
  setIsGenerating: (isGenerating: boolean) => void
  setIsGeneratingAudio: (isGeneratingAudio: boolean) => void
  setAudioGenerationStatus: (status: AppState['audioGenerationStatus']) => void
  setMode: (mode: ParameterMode) => void
  setPosterStatus: (status: 'idle' | 'loading' | 'ready') => void
  setPosterUrl: (url: string | null) => void
  setTrailerAudioBuffer: (buffer: AudioBuffer | null) => void
  setCaptionStyle: (style: CaptionStyle) => void
  setVideoGenerationStatus: (status: AppState['videoGenerationStatus']) => void
  setIsGeneratingVideo: (isGeneratingVideo: boolean) => void
  generateScript: (toast: any) => Promise<boolean>
  processCustomContext: (toast: any) => Promise<void>
  generateTrailerAudio: (toast: any, audioCtxRef: React.MutableRefObject<AudioContext | null>) => Promise<boolean>
}

export const useStore = create<AppState>((set) => ({
  parameters: {
    genre: "",
    setting: "",
    character: "",
    conflict: "",
    plotTwist: "",
  },
  movieTitle: "",
  customContextEnabled: false,
  customContext: "",
  isProcessingContext: false,
  contextFieldsVisible: false,
  currentScript: "",
  posterData: null,
  posterDataError: null,
  isGenerating: false,
  isGeneratingAudio: false,
  audioGenerationStatus: {
    show: false,
    status: "generating",
    message: "",
  },
  mode: DEFAULT_PARAMETER_MODE,
  posterStatus: 'idle',
  posterUrl: null,
  trailerAudioBuffer: null,
  captionStyle: DEFAULT_CAPTION_STYLE,
  videoGenerationStatus: {
    show: false,
    status: "idle",
    message: "",
    progress: 0,
  },
  isGeneratingVideo: false,

  setParameters: (parameters) => set({ parameters }),
  setMovieTitle: (movieTitle) => set({ movieTitle }),
  setCustomContextEnabled: (customContextEnabled) => set({ customContextEnabled }),
  setCustomContext: (customContext) => set({ customContext, contextFieldsVisible: false }),
  setCurrentScript: (currentScript) => set((state) => currentScript === state.currentScript ? {} : {
    currentScript,
    trailerAudioBuffer: null,
    audioGenerationStatus: { show: false, status: "generating", message: "" },
  }),
  setPosterData: (posterData) => set({ posterData }),
  setPosterDataError: (posterDataError) => set({ posterDataError }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setIsGeneratingAudio: (isGeneratingAudio) => set({ isGeneratingAudio }),
  setAudioGenerationStatus: (audioGenerationStatus) => set({ audioGenerationStatus }),
  setMode: (mode) => set({ mode }),
  setPosterStatus: (posterStatus) => set({ posterStatus }),
  setPosterUrl: (posterUrl) => set({ posterUrl }),
  setTrailerAudioBuffer: (trailerAudioBuffer) => set({ trailerAudioBuffer }),
  setCaptionStyle: (captionStyle) => set({ captionStyle }),
  setVideoGenerationStatus: (videoGenerationStatus) => set({ videoGenerationStatus }),
  setIsGeneratingVideo: (isGeneratingVideo) => set({ isGeneratingVideo }),

  processCustomContext: async (toast) => {
    const state = useStore.getState()
    if (state.isProcessingContext || state.isGenerating || !state.customContextEnabled) return
    const context = state.customContext.trim()
    if (!context) {
      toast({ title: "Missing context", description: "Add some story details first.", variant: "destructive" })
      return
    }
    set({ isProcessingContext: true, contextFieldsVisible: false })
    try {
      const client = await getApiClientAsync()
      if (!client) throw new Error("Please add an OpenRouter key in Settings.")
      const data = await client.generateContextData(context)
      if (!data) {
        set({ contextFieldsVisible: true })
        toast({ title: "Fill in the fields manually", description: "The AI returned invalid data after retrying. Your existing values were kept so you can edit them.", variant: "destructive" })
        return
      }
      const { movieTitle, ...parameters } = data
      set({ parameters, movieTitle, contextFieldsVisible: true })
      toast({ title: "Context processed", description: "Review or edit the fields, then generate your script." })
    } catch (error) {
      toast({ title: "Context processing failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    } finally {
      set({ isProcessingContext: false })
    }
  },

  generateScript: async (toast) => {
    const state = useStore.getState();
    if (state.isGenerating || state.isProcessingContext || (state.customContextEnabled && !state.contextFieldsVisible)) return false;
    const { parameters, movieTitle, setMovieTitle, setCurrentScript, setIsGenerating } = state;
    const customContext = state.customContextEnabled ? state.customContext.trim() : "";
    const generationContext = getGenerationContext(state.mode, customContext);

    if (!parameters.genre) {
      toast({
        title: "Missing Parameters",
        description: "Please select at least a genre.",
        variant: "destructive",
      });
      return false;
    }

    setIsGenerating(true);

    try {
      const apiClient = await getApiClientAsync();
      if (!apiClient) throw new Error("Please add an OpenRouter key in Settings.");
      let titleToUse = movieTitle;
      if (!titleToUse) {
        titleToUse = await apiClient.generateMovieTitle(parameters, generationContext);
        setMovieTitle(titleToUse);
      }

      const script = await apiClient.generateScript(parameters, titleToUse, generationContext);
      setCurrentScript(script);

      toast({
        title: "Script ready",
        description: "Review your script, then move to Audio to give it a voice.",
      });
      return true;
    } catch (error) {
      console.error("Script generation error:", error);
      toast({
        title: "Generation Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate script. Please check your API keys and try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsGenerating(false);
    }
  },

  generateTrailerAudio: async (toast: any, audioCtxRef: React.MutableRefObject<AudioContext | null>) => {
    if (useStore.getState().isGeneratingAudio) return false;
    const { currentScript, movieTitle, parameters, setIsGeneratingAudio, setAudioGenerationStatus, setTrailerAudioBuffer } = useStore.getState();

    if (!currentScript.trim()) {
      toast({ title: "No Script Available", description: "Please generate a script first.", variant: "destructive" });
      return false;
    }

    setIsGeneratingAudio(true);
    setAudioGenerationStatus({ show: true, status: "generating", message: "Initializing audio engine..." });

    try {
      const apiClient = await getApiClientAsync();
      if (!apiClient) throw new Error("Please add an ElevenLabs key in Settings.");
      const audioCtx = await initAudioContext(audioCtxRef, setAudioGenerationStatus, toast);
      if (!audioCtx) return false;

      // Step 1: Generate the voiceover first — its length defines the final trailer length.
      const voiceoverAudioBuffer = await generateAndDecodeVoiceover(apiClient, currentScript, audioCtx, setAudioGenerationStatus);
      const voiceoverLengthSamples = voiceoverAudioBuffer.length;

      // Step 2: Load the music and stretch it to exactly the voiceover's length
      // (pitch and formants approximately preserved via WSOLA time-stretching).
      const musicAudioBuffer = await fetchAndDecodeMusic(audioCtx, setAudioGenerationStatus);
      setAudioGenerationStatus({ show: true, status: "generating", message: "Stretching music to voiceover length..." });
      const finalMusicAudioBuffer = await stretchMusicToVoiceover(
        musicAudioBuffer,
        voiceoverAudioBuffer.sampleRate,
        voiceoverLengthSamples
      );

      // Step 3: Stitch the voiceover and the stretched music together.
      setAudioGenerationStatus({ show: true, status: "generating", message: "Mixing voiceover and music..." });
      const mixedAudioBuffer = await mixVoiceoverAndMusic(voiceoverAudioBuffer, finalMusicAudioBuffer, 0.5);
      if (useStore.getState().currentScript !== currentScript) {
        throw new Error("The script changed during generation. Generate audio again for the current script.");
      }
      setTrailerAudioBuffer(mixedAudioBuffer);
      const audioUrl = createAndSaveAudio(mixedAudioBuffer, movieTitle, currentScript, parameters);

      setAudioGenerationStatus({ show: true, status: "success", message: "Trailer audio ready!", audioUrl });
      toast({ title: "Trailer audio ready", description: "Listen or download in Audio, or continue with your movie poster." });
      return true;

    } catch (error) {
      console.error("Audio generation pipeline error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setAudioGenerationStatus({ show: true, status: "error", message: `Error: ${errorMessage}` });
      toast({ title: "Audio Generation Failed", description: errorMessage, variant: "destructive" });
      return false;
    } finally {
      setIsGeneratingAudio(false);
    }
  },
}))

async function initAudioContext(audioCtxRef: React.MutableRefObject<AudioContext | null>, setAudioGenerationStatus: (status: any) => void, toast: any): Promise<AudioContext | null> {
  if (audioCtxRef.current) return audioCtxRef.current;
  try {
    const newAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = newAudioCtx;
    return newAudioCtx;
  } catch (e) {
    console.error("Failed to initialize AudioContext:", e);
    toast({ title: "Audio Engine Error", description: "Could not initialize audio engine.", variant: "destructive" });
    setAudioGenerationStatus({ show: false, status: "error", message: "Audio engine init failed." });
    return null;
  }
}

async function generateAndDecodeVoiceover(apiClient: any, script: string, audioCtx: AudioContext, setAudioGenerationStatus: (status: any) => void): Promise<AudioBuffer> {
  setAudioGenerationStatus({ show: true, status: "generating", message: "Generating voiceover..." });
  const voiceoverArrayBuffer = await apiClient.generateVoiceover(script);
  setAudioGenerationStatus({ show: true, status: "generating", message: "Decoding voiceover..." });
  return await audioCtx.decodeAudioData(voiceoverArrayBuffer.slice(0));
}

async function fetchAndDecodeMusic(audioCtx: AudioContext, setAudioGenerationStatus: (status: any) => void): Promise<AudioBuffer> {
  setAudioGenerationStatus({ show: true, status: "generating", message: "Loading background music..." });
  const musicTrack = BACKGROUND_MUSIC_TRACKS[0];
  const musicResponse = await fetch(musicTrack.src);
  if (!musicResponse.ok) throw new Error(`Failed to fetch background music: ${musicResponse.statusText}`);
  const musicArrayBuffer = await musicResponse.arrayBuffer();
  setAudioGenerationStatus({ show: true, status: "generating", message: "Decoding music..." });
  return await audioCtx.decodeAudioData(musicArrayBuffer.slice(0));
}

function createAndSaveAudio(mixedBuffer: AudioBuffer, title: string, script: string, parameters: any): string {
  const finalOutputArrayBuffer = convertAudioBufferToWavArrayBuffer(mixedBuffer);
  const audioUrl = createAudioBlob(finalOutputArrayBuffer);
  const newAudioTrack: AudioTrack = {
    id: `trailer-${Date.now()}`,
    title: title || "Untitled Trailer",
    script: script,
    parameters: parameters,
    url: audioUrl,
    timestamp: new Date(),
    duration: mixedBuffer.duration,
    backgroundMusicId: BACKGROUND_MUSIC_TRACKS[0].id,
  };
  saveAudioTrack(newAudioTrack);
  return audioUrl;
}
