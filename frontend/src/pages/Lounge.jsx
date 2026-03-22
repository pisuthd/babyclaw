// import { useState } from 'react'
// import babyclawBrand from '/babyclaw-brand.png' 

// function Lounge() {

//   const { fetchWithPayment, isPending } = useFetchWithPayment(thirdwebClient);

//   const [messages, setMessages] = useState([])
//   const [input, setInput] = useState('')
//   const [isLoading, setIsLoading] = useState(false)
//   const [paymentStatus, setPaymentStatus] = useState(null)
//   const [currentStreamingMessage, setCurrentStreamingMessage] = useState('')

//   const handleSubmit = async (e) => {
//     e.preventDefault()

//     if (!input.trim() || isLoading) return
 

//     const userMessage = input.trim()
//     setInput('')
//     setMessages(prev => [...prev, { role: 'user', content: userMessage }])
//     setIsLoading(true)
//     setPaymentStatus('initiating')
//     setCurrentStreamingMessage('')

//     try {

//       console.log("test for now...")

//       const response = await fetchWithPayment("http://localhost:5001/verify-and-settle")

//       console.log("respone ", response)

//       // Initiate payment and stream
//       // setPaymentStatus('processing')

//       // const streamUrl = import.meta.env.VITE_STREAM_URL || 'http://localhost:5001/stream'

//       // const response = await fetchWithPayment(streamUrl, {
//       //   method: 'POST',
//       //   headers: {
//       //     'Content-Type': 'application/json'
//       //   },
//       //   body: JSON.stringify({ prompt: userMessage })
//       // })

//       // setPaymentStatus('streaming')

//       // if (!response.ok) {
//       //   throw new Error(`HTTP error! status: ${response.status}`)
//       // }

//       // // Stream the response
//       // const reader = response.body.getReader()
//       // const decoder = new TextDecoder()
//       // let aiResponse = ''

//       // while (true) {
//       //   const { done, value } = await reader.read()
//       //   if (done) break

//       //   const chunk = decoder.decode(value)
//       //   aiResponse += chunk
//       //   setCurrentStreamingMessage(aiResponse)
//       // }

//       // // Add complete AI message
//       // setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }])
//       // setPaymentStatus('completed')

//     } catch (error) {
//       console.error('Chat error:', error)
//       setMessages(prev => [...prev, {
//         role: 'error',
//         content: `Error: ${error.message}. Please try again.`
//       }])
//       setPaymentStatus('error')
//     } finally {
//       setIsLoading(false)
//       setCurrentStreamingMessage('')
//       setTimeout(() => setPaymentStatus(null), 3000)
//     }
//   }

//   const onClick = async () => {
//     // try {
//     //   const res = await fetchWithPayment("http://localhost:5001/verify-and-settle", {
//     //     method: "POST",
//     //     headers: {
//     //       'Content-Type': 'application/json'
//     //     },
//     //   });
//     //   console.log("Success:", res);
//     // } catch (err) {
//     //   console.error("Call failed:", err);
//     // }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-bg-primary to-bg-secondary">
//       <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
//         {/* Header */}
//         <div className="text-center mb-8">
//           <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent">
//             Baby Lounge
//           </h1>
//           <p className="text-lg text-text-secondary">
//             Chat with AI • Pay with x402 • Get Instant Responses
//           </p>
//         </div>

//         {/* Main Content - 30/70 Split */}
//         <div className="grid grid-cols-1 lg:grid-cols-10 gap-6  ">

//           {/* Left Panel - Info (30%) */}
//           <div className="lg:col-span-3 bg-bg-secondary/50 backdrop-blur-sm rounded-2xl border border-border-color p-6 flex flex-col">
//             {/* Mascot */}
//             <div className="flex justify-center mb-6">
//               <img
//                 src={babyclawBrand}
//                 alt="BabyClaw AI"
//                 className="w-32 h-32 animate-float drop-shadow-[0_20px_40px_rgba(62,223,223,0.3)]"
//               />
//             </div>

//             {/* What is Baby Lounge */}
//             <div className="mb-6">
//               <h3 className="text-xl font-semibold text-text-primary mb-3">
//                 What is Baby Lounge?
//               </h3>
//               <p className="text-text-secondary text-sm leading-relaxed">
//                 Your exclusive AI assistant powered by BabyClaw. Ask questions about lending,
//                 get token insights, supply tokens, and more - all powered by x402 payments.
//               </p>
//             </div>

//             {/* How it Works */}
//             <div className="mb-6">
//               <h3 className="text-xl font-semibold text-text-primary mb-3">
//                 How it Works
//               </h3>
//               <div className="space-y-3">
//                 <div className="flex items-start gap-3">
//                   <span className="flex-shrink-0 w-6 h-6 bg-accent-cyan/20 rounded-full flex items-center justify-center text-accent-cyan text-xs font-bold">1</span>
//                   <p className="text-text-secondary text-sm">Connect your wallet via RainbowKit</p>
//                 </div>
//                 <div className="flex items-start gap-3">
//                   <span className="flex-shrink-0 w-6 h-6 bg-accent-cyan/20 rounded-full flex items-center justify-center text-accent-cyan text-xs font-bold">2</span>
//                   <p className="text-text-secondary text-sm">Type your message to Baby AI</p>
//                 </div>
//                 <div className="flex items-start gap-3">
//                   <span className="flex-shrink-0 w-6 h-6 bg-accent-cyan/20 rounded-full flex items-center justify-center text-accent-cyan text-xs font-bold">3</span>
//                   <p className="text-text-secondary text-sm">Auto-pay with x402 (0.01 USDT or 0.1 CELO)</p>
//                 </div>
//                 <div className="flex items-start gap-3">
//                   <span className="flex-shrink-0 w-6 h-6 bg-accent-cyan/20 rounded-full flex items-center justify-center text-accent-cyan text-xs font-bold">4</span>
//                   <p className="text-text-secondary text-sm">Get instant AI response</p>
//                 </div>
//               </div>
//             </div>

//             {/* Features */}
//             <div className="flex-1">
//               <h3 className="text-xl font-semibold text-text-primary mb-3">
//                 Features
//               </h3>
//               <div className="space-y-2">
//                 <div className="flex items-center gap-2 text-sm text-text-secondary">
//                   <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full"></span>
//                   AI-powered lending assistance
//                 </div>
//                 <div className="flex items-center gap-2 text-sm text-text-secondary">
//                   <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full"></span>
//                   Instant token price checks
//                 </div>
//                 <div className="flex items-center gap-2 text-sm text-text-secondary">
//                   <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full"></span>
//                   Supply tokens via chat
//                 </div>
//                 <div className="flex items-center gap-2 text-sm text-text-secondary">
//                   <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full"></span>
//                   Seamless x402 payments
//                 </div>
//                 <div className="flex items-center gap-2 text-sm text-text-secondary">
//                   <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full"></span>
//                   Real-time streaming responses
//                 </div>
//               </div>
//             </div>

//             {/* Trust Badges */}
//             <div className="mt-6 pt-6 border-t border-border-color">
//               <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
//                 <span className="px-3 py-1 bg-accent-cyan/10 rounded-full">
//                   ⚡ x402 Powered
//                 </span>
//                 <span className="px-3 py-1 bg-accent-cyan/10 rounded-full">
//                   🔐 Secure Payments
//                 </span>
//                 <span className="px-3 py-1 bg-accent-cyan/10 rounded-full">
//                   🌐 Celo Mainnet
//                 </span>
//               </div>
//             </div>
//           </div>

//           {/* Right Panel - Chat (70%) */}
//           <div className="lg:col-span-7 bg-bg-secondary/50 backdrop-blur-sm rounded-2xl border border-border-color flex flex-col overflow-hidden">

//             {/* Chat Messages */}
//             <div className="flex-1 overflow-y-auto p-6 space-y-4">
//               {messages.length === 0 && (
//                 <div className="h-full flex flex-col items-center justify-center text-center">
//                   <div className="w-16 h-16 mb-4 rounded-full bg-accent-cyan/20 flex items-center justify-center">
//                     <span className="text-3xl">💬</span>
//                   </div>
//                   <h3 className="text-xl font-semibold text-text-primary mb-2">
//                     Start a Conversation
//                   </h3>
//                   <p className="text-text-secondary max-w-md">
//                     Ask Baby AI anything about lending, tokens, or supply assets to the market.
//                   </p>
//                 </div>
//               )}

//               {messages.map((msg, idx) => (
//                 <div
//                   key={idx}
//                   className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
//                 >
//                   <div
//                     className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
//                       ? 'bg-accent-cyan text-bg-primary'
//                       : msg.role === 'error'
//                         ? 'bg-red-500/20 border border-red-500/50 text-red-400'
//                         : 'bg-bg-primary/50 text-text-primary'
//                       }`}
//                   >
//                     {msg.content}
//                   </div>
//                 </div>
//               ))}

//               {/* Streaming Message */}
//               {currentStreamingMessage && (
//                 <div className="flex justify-start">
//                   <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-bg-primary/50 text-text-primary">
//                     <div className="flex items-start gap-2">
//                       <span className="animate-pulse">●</span>
//                       <span>{currentStreamingMessage}</span>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Payment Status Indicator */}
//               {paymentStatus && paymentStatus !== 'completed' && (
//                 <div className="flex justify-center">
//                   <div className="px-4 py-2 bg-accent-cyan/10 rounded-full text-accent-cyan text-sm flex items-center gap-2">
//                     {paymentStatus === 'initiating' && (
//                       <>
//                         <span className="animate-spin">⚙️</span>
//                         Initiating payment...
//                       </>
//                     )}
//                     {paymentStatus === 'processing' && (
//                       <>
//                         <span className="animate-spin">⚙️</span>
//                         Processing x402 payment...
//                       </>
//                     )}
//                     {paymentStatus === 'streaming' && (
//                       <>
//                         <span className="animate-pulse">✅</span>
//                         Payment confirmed! Streaming response...
//                       </>
//                     )}
//                     {paymentStatus === 'error' && (
//                       <>
//                         <span>❌</span>
//                         Payment failed
//                       </>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </div>

//             <button onClick={onClick}>test</button>

//             {/* Input Area */}
//             <div className="border-t border-border-color p-4 bg-bg-primary/30">
//               <form onSubmit={handleSubmit} className="flex gap-3">
//                 <input
//                   type="text"
//                   value={input}
//                   onChange={(e) => setInput(e.target.value)}
//                   placeholder="Ask Baby AI anything..."
//                   disabled={isLoading}
//                   className="flex-1 px-4 py-3 bg-bg-primary/50 border border-border-color rounded-xl text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-cyan disabled:opacity-50"
//                 />
//                 <button
//                   type="submit"
//                   disabled={isLoading || !input.trim()}
//                   className="px-6 py-3 bg-accent-cyan text-bg-primary font-semibold rounded-xl transition-all hover:bg-accent-cyan-hover disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(62,223,223,0.3)]"
//                 >
//                   {isLoading ? (
//                     <span className="flex items-center gap-2">
//                       <span className="animate-spin">⚙️</span>
//                       {paymentStatus === 'processing' ? 'Paying...' : 'Sending...'}
//                     </span>
//                   ) : (
//                     'Send'
//                   )}
//                 </button>
//               </form>

//               <div className="mt-3 text-center text-xs text-text-secondary">
//                 💰 Each message costs 0.01 USDT or 0.1 CELO via x402
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// export { Lounge }