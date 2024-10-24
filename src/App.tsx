import { useState } from 'react'
import axios from 'axios'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Mic, Download, Key, PlayCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function TTSPage() {
  const [inputText, setInputText] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [isTesting, setIsTesting] = useState<boolean>(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [voice, setVoice] = useState<string>('alloy')
  const { toast } = useToast()

  const removeExtraWhitespaces = (text: string): string => {
    return text.replace(/\s{2,}/g, ' ')
  }

  const sendTextForTTS = async (text: string, chunkIndex: number): Promise<ArrayBuffer | undefined> => {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'tts-1',
          input: text,
          voice: voice,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      )
      console.log(`Chunk ${chunkIndex} audio generated`)
      return response.data
    } catch (error) {
      console.error('Error generating speech:', error)
      toast({
        title: "Error",
        description: "Failed to generate speech. Please check your API key and try again.",
        variant: "destructive",
      })
    }
  }

  const splitTextAndProcess = async (): Promise<void> => {
    if (!inputText || !apiKey) {
      toast({
        title: "Error",
        description: "Please enter both text and API key.",
        variant: "destructive",
      })
      return
    }

    setProgress(0)
    setIsProcessing(true)
    const data = removeExtraWhitespaces(inputText)

    const chunkSize = 4000
    let chunkCount = 0
    let currentIndex = 0
    const audioBuffers: ArrayBuffer[] = []

    try {
      while (currentIndex < data.length) {
        let endIndex = currentIndex + chunkSize

        if (endIndex < data.length) {
          const periodIndex = data.lastIndexOf('.', endIndex)
          if (periodIndex > currentIndex) {
            endIndex = periodIndex + 1
          } else {
            const nextPeriodIndex = data.indexOf('.', endIndex)
            if (nextPeriodIndex === -1 || nextPeriodIndex - currentIndex > chunkSize) {
              throw new Error('Sentence exceeds chunk size limit of 4000 characters.')
            }
            endIndex = nextPeriodIndex + 1
          }
        }

        const chunk = data.slice(currentIndex, endIndex).trim()
        const audioData = await sendTextForTTS(chunk, chunkCount)
        if (audioData) {
          audioBuffers.push(audioData)
        }
        chunkCount++
        currentIndex = endIndex

        setProgress(Math.min(100, Math.floor((currentIndex / data.length) * 100)))
      }

      const mergedAudioBlob = new Blob(audioBuffers, { type: 'audio/mp3' })
      const audioUrl = URL.createObjectURL(mergedAudioBlob)
      setAudioUrl(audioUrl)
      toast({
        title: "Success",
        description: "Audio generated successfully!",
      })
    } catch (error) {
      console.error('Error processing text:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProgress(100)
    }
  }

  const handleDownload = () => {
    if (audioUrl) {
      const link = document.createElement('a')
      link.href = audioUrl
      link.download = 'generated_audio.mp3'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const testVoice = async () => {
    if (!apiKey) {
      toast({
        title: "Error",
        description: "Please enter your OpenAI API Key.",
        variant: "destructive",
      })
      return
    }

    setIsTesting(true)
    try {
      const testText = "This is a test of the selected voice."
      const audioData = await sendTextForTTS(testText, 0)
      if (audioData) {
        const audioBlob = new Blob([audioData], { type: 'audio/mp3' })
        const url = URL.createObjectURL(audioBlob)
        setTestAudioUrl(url)
        toast({
          title: "Success",
          description: "Voice test generated successfully!",
        })
      }
    } catch (error) {
      console.error('Error testing voice:', error)
      toast({
        title: "Error",
        description: "Failed to test voice. Please check your API key and try again.",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="container mx-auto p-4 min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100">Text-to-Speech Converter</CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-300">
            Convert your text into natural-sounding speech using OpenAI's advanced TTS technology
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter your text here"
            className="min-h-[200px] resize-none"
          />
          <div className="flex space-x-2">
            <Input
              type="password"
              placeholder="Enter your OpenAI API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-grow"
            />
            <Select value={voice} onValueChange={setVoice}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alloy">Alloy</SelectItem>
                <SelectItem value="echo">Echo</SelectItem>
                <SelectItem value="fable">Fable</SelectItem>
                <SelectItem value="onyx">Onyx</SelectItem>
                <SelectItem value="nova">Nova</SelectItem>
                <SelectItem value="shimmer">Shimmer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between items-center">
            <Button
              onClick={testVoice}
              disabled={isTesting}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Test Voice
                </>
              )}
            </Button>
            {testAudioUrl && (
              <audio controls className="max-w-[200px]">
                <source src={testAudioUrl} type="audio/mp3" />
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
          <div className="text-center mb-2">
            <a
              href="https://www.youtube.com/watch?v=muaHr3oYf7U"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex items-center justify-center"
            >
              <Key className="w-4 h-4 mr-1" />
              How to Create an OpenAI Account & Generate an API Key
            </a>
          </div>
          <Button
            onClick={splitTextAndProcess}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Convert Text to Speech
              </>
            )}
          </Button>
          {isProcessing && (
            <Progress value={progress} className="w-full" />
          )}
          {audioUrl && (
            <div className="mt-4 space-y-2">
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Generated Audio:</h3>
              <audio controls className="w-full">
                <source src={audioUrl} type="audio/mp3" />
                Your browser does not support the audio element.
              </audio>
              <Button onClick={handleDownload} className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                <Download className="mr-2 h-4 w-4" />
                Download Audio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Toaster />
    </div>
  )
}