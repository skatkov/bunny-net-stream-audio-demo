import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button", "status"]

  connect() {
    this.isRecording = false
    this.mediaRecorder = null
    this.audioChunks = []
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording()
    } else {
      await this.startRecording()
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          volume: 1.0
        }
      })

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      this.audioChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
          // Stream immediately to Bunny.net
          this.streamChunk(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }

      this.mediaRecorder.start(1000) // Send data every 1000ms
      this.isRecording = true
      this.updateUI()

    } catch (error) {
      console.error('Error accessing microphone:', error)
      this.updateStatus('Error: Could not access microphone')
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
      this.isRecording = false
      this.updateUI()
    }
  }

  async streamChunk(audioChunk) {
    try {
      const formData = new FormData()
      const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content')

      const response = await fetch('/stream', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'audio/webm'
        },
        body: audioChunk
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Streamed chunk to Bunny.net:', result)

    } catch (error) {
      console.error('Error streaming to Bunny.net:', error)
      this.updateStatus('Streaming error: ' + error.message)
    }
  }

  updateUI() {
    if (this.isRecording) {
      this.buttonTarget.textContent = 'Stop Recording'
      this.buttonTarget.classList.remove('btn-primary')
      this.buttonTarget.classList.add('btn-danger')
      this.updateStatus('Recording and streaming to Bunny.net...')
    } else {
      this.buttonTarget.textContent = 'Start Recording'
      this.buttonTarget.classList.remove('btn-danger')
      this.buttonTarget.classList.add('btn-primary')
      this.updateStatus('Ready to record')
    }
  }

  updateStatus(message) {
    if (this.hasStatusTarget) {
      this.statusTarget.textContent = message
    }
  }
}