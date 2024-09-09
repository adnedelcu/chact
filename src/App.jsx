import { useEffect, useState } from "react";
import Markdown from 'react-markdown';
import Prism from "prismjs";

function App() {
  const [prompt, setPrompt] = useState('');
  const [chat, setChat] = useState([
    {
      role: 'system',
      content: 'You are a software developer student that only speaks in rhymes' // This is the system message, it will control the behavior of the chatbot
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const callChatApi = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5050/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          mode: 'development',
          provider: 'open-ai'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          stream: true,
          messages: chat
        })
      });

      if (!response.ok) {
        const { error } = await response.json();
        setIsLoading(false);
        throw new Error(error);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let dataResult = '';
      const chatEntry = {};
      let isDone = false;

      while (!isDone) {
        const result = await reader.read();
        if (result.done) {
          isDone = true;
          break;
        }

        const chunk = decoder.decode(result.value, { stream: true });
        const lines = chunk.split('\n');
        lines.forEach(line => {
          if (line.startsWith('data:')) {
            const jsonStr = line.replace('data:', '');
            const data = JSON.parse(jsonStr);
            const content = data.choices[0]?.delta?.content;
            if (content) {
              dataResult += content;
            }

            setChat([...chat, { role: 'assistant', content: dataResult }]);
          }
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const callImageApi = async (count, size, base64) => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5050/api/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          mode: 'development',
          provider: 'open-ai'
        },
        body: JSON.stringify({
          // model: 'dall-e-3',
          n: count || 1,
          size: size || "256x256",
          response_format: base64 ? 'b64_json' : null,
          prompt: prompt
        })
      });

      if (!response.ok) {
        const { error } = await response.json();
        setIsLoading(false);
        throw new Error(error);
      }

      let images = await response.json();
      images = images.map(image => {
        return {
          uuid: image.uuid,
          url: image.url ? `${image.url}&t=${image.uuid}` : `data:image/png;base64,${image.b64_json}`,
        }
      });
      setChat([...chat, { role: 'assistant', images: images }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // console.log(chat);
    if (chat.length && chat[chat.length-1]?.role === 'user') {
      if (chat[chat.length-1].content.toLowerCase().includes('draw')) {
        let count = prompt.match(/draw \d+/);
        count = count && count[0].replace('draw ', '');
        let size = prompt.match(/with size \d+x\d+/);
        if (!size) {
          size = prompt.match(/with size \d+p?x? by \d+p?x?/);
        }
        size = size && size[0].replace('with size ', '');
        size = size && size.split(' by ');
        if (size?.length == 2) {
          size = size.map(entry => parseInt(entry));
        }
        let base64 = prompt.match(/base64/) || false;
        if (base64[0]) {
          base64 = true;
        }
        // console.log(size, size?.join('x'));
        callImageApi(count, size?.join('x'), base64);
      } else {
        callChatApi();
      }
      setPrompt('');
    }
  }, [chat]);

  const sendPrompt = () => {
    if (!prompt.trim().length) {
      alert('Please enter a prompt');
      return;
    }
    setChat([...chat, {role: 'user', content: prompt}]);
  };

  const updateOrder = (images, index) => {
    const first = images.shift();
    images.push(first);
    const newChat = JSON.parse(JSON.stringify(chat));
    newChat[index].images = images;
    setChat(newChat);
  };

  return (
    <>
      <main className="container">
        <div className="mockup-phone mx-auto">
          <div className="camera"></div>
          <div className="display">
            <div className="artboard artboard-demo phone-1">
              <div className="w-full chats overflow-auto">
                {chat.map((entry, index) => {
                  if (entry.role == 'system') {
                    return <p className="text-muted" key={index}>{entry.content}</p>
                  }

                  return <div className={`chat ${entry.role == 'assistant' ? 'chat-start' : 'chat-end'}`} key={index}>
                    <div className={`chat-bubble ${entry.role == 'assistant' ? 'chat-bubble-primary' : 'chat-bubble-success'}`}>
                      {entry.content && <Markdown>{entry.content}</Markdown>}
                      {entry.images && (
                        <div className="stack">
                          {entry.images.map((image, key) => <img className={`transition-all duration-500 ${key === 0 ? 'ease-in-out' : 'ease-in'}`} key={image.uuid} src={`${image.url}`} alt={image.uuid} onClick={() => updateOrder(entry.images, index)} />)}
                        </div>
                      )}
                    </div>
                  </div>;
                })}
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
