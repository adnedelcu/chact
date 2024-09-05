import { useEffect, useState } from "react";
import Markdown from 'react-markdown';
import Prism from "prismjs";

function App() {
  const [prompt, setPrompt] = useState('');
  const [chat, setChat] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const callApi = async () => {
    try {
      setIsLoading(true);
      // ... code up to the prompt validation
      // Request
      const response = await fetch('http://localhost:5050/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          mode: 'development', // Set the mode to development to not send the request to Open AI for now
          provider: 'open-ai'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          stream: true,
          messages: [
            {
              role: 'system',
              content: 'You are a software developer student that only speaks in rhymes' // This is the system message, it will control the behavior of the chatbot
            },
            {
              role: 'user',
              content: prompt // This is the user message, it will be the prompt for the chatbot
            }
          ]
        })
      });
      if (!response.ok) {
        // If the response is not ok, throw an error by parsing the JSON response
        const { error } = await response.json();
        setIsLoading(false);
        throw new Error(error);
      }

      // Process stream response
      // Get the responses stream
      const reader = response.body.getReader();
      // Create a new TextDecoder
      const decoder = new TextDecoder('utf-8');
      // Variable to store the data result
      let dataResult = '';
      const chatEntry = {};
      // Variable to check if the stream is done
      let isDone = false;
      // While the stream is not closed, i.e. done is false
      while (!isDone) {
        // Read the next chunk
        const result = await reader.read();
        // If the result is done, break out of the loop
        if (result.done) {
          isDone = true;
          break;
        }
        // Decode the result
        const chunk = decoder.decode(result.value, { stream: true });
        // Split lines by new line, you can get more than one line per chunk
        const lines = chunk.split('\n');
        // Loop through each line
        lines.forEach(line => {
          // Check if the line starts with data:, that's how Open AI sends the data
          if (line.startsWith('data:')) {
            // Get the JSON string without the data: prefix
            const jsonStr = line.replace('data:', '');
            // Parse the JSON string
            const data = JSON.parse(jsonStr);
            // Get the content from the first choice
            const content = data.choices[0]?.delta?.content;
            // If there is content
            if (content) {
              dataResult += content;
            }
            setChat([...chat, { role: 'system', content: dataResult }]);
            // setChat((prevChat) => [...prevChat, { role: 'system', content: dataResult }]);
          }
        });
      }
    } catch (error) {
      // If an error occurs, log it to the console
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log(chat);
    if (chat.length && chat[chat.length-1]?.role === 'user') {
      callApi();
      setPrompt('');
    }
    Prism.highlightAll();
  }, [chat]);

  const sendPrompt = () => {
    if (!prompt.trim().length) {
      alert('Please enter a prompt');
      return;
    }
    setChat([...chat, {role: 'user', content: prompt}]);
  };

  return (
    <>
      <main className="container">
        <div className="mockup-phone mx-auto">
          <div className="camera"></div>
          <div className="display">
            <div className="artboard artboard-demo phone-1">
              <div className="w-full chats overflow-auto">
                {chat.map((entry, index) => <div className={`chat ${entry.role == 'system' ? 'chat-start' : 'chat-end'}`} key={index}><div className={`chat-bubble ${entry.role == 'system' ? 'chat-bubble-primary' : 'chat-bubble-info'}`}><Markdown>{entry.content}</Markdown></div></div>)}
              </div>
            </div>
            <div className="pb-6 w-full self-end join">
              <input type="text" placeholder="Type here" className="input input-bordered w-full max-w-xs" disabled={chat.filter((entry) => entry.role === 'user').length >= 5 || isLoading} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              <button className="btn btn-primary" disabled={chat.filter((entry) => entry.role === 'user').length >= 5 || isLoading} onClick={sendPrompt}>Submit✨</button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default App;
