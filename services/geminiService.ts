import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

export const generatePracticeQuestion = async (subject: string): Promise<string> => {
  const client = getClient();
  if (!client) return "Please configure your API Key to generate questions.";

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a single, challenging practice question for Class 9 ${subject}. 
      Format it clearly. Do not provide the answer immediately, just the question.`,
      config: {
        temperature: 0.7,
      }
    });
    
    return response.text || "Could not generate a question at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI Tutor. Please try again later.";
  }
};

export const generateStudyTip = async (subject: string): Promise<string> => {
    const client = getClient();
    if (!client) return "Stay consistent and practice daily!";
  
    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Give me one short, powerful study tip for a Class 9 student studying ${subject}. Max 2 sentences.`,
      });
      
      return response.text || "Review your notes daily.";
    } catch (error) {
      return "Focus on understanding concepts rather than rote memorization.";
    }
  };

export const getChatResponse = async (history: ChatMessage[], newMessage: string, subject: string): Promise<string> => {
  const client = getClient();
  if (!client) return "I need an API Key to answer that.";

  try {
    // Transform our internal ChatMessage format to the API's expected format
    // We limit history to the last 10 messages to save tokens/context
    const contents = history.slice(-10).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    // Add the new message
    contents.push({
      role: 'user',
      parts: [{ text: `[Context: Class 9 ${subject}] ${newMessage}` }]
    });

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: `You are a friendly, encouraging, and highly intelligent AI Tutor for a Class 9 student. 
        Your subject of expertise right now is ${subject}.
        - Keep answers concise but clear (under 150 words usually).
        - Use simple language suitable for a 14-15 year old.
        - If asked a question, guide them to the answer rather than just giving it straight away if it's a homework problem.
        - Use formatting (bullet points, bold text) to make it readable.`,
      }
    });

    return response.text || "I'm having trouble thinking of an answer right now.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I lost connection. Please try asking again.";
  }
};