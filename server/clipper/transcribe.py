"""CPU transcription with word timings. Model is installed in the container image."""
import json, os, sys
from faster_whisper import WhisperModel
source, destination = sys.argv[1:3]
model = WhisperModel(os.environ.get('WHISPER_MODEL', '/opt/whisper-small.en'), device='cpu', compute_type='int8', cpu_threads=int(os.environ.get('WHISPER_THREADS', '2')))
segments, info = model.transcribe(source, word_timestamps=True, vad_filter=True, beam_size=5, condition_on_previous_text=False)
result=[]
for s in segments:
    result.append({'start':s.start,'end':s.end,'text':s.text,'words':[{'start':w.start,'end':w.end,'word':w.word} for w in (s.words or [])]})
    print(json.dumps({'seconds':s.end}), flush=True)
with open(destination+'.tmp','w') as f: json.dump({'segments':result,'language':info.language},f)
os.replace(destination+'.tmp',destination)
