import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import type { Template } from '../types';

interface CaptionInputProps {
  onSubmit: (data: { templateId: string, captions: string[] }) => void;
}

export default function CaptionInput({ onSubmit }: CaptionInputProps) {
  const [templateId, setTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [captions, setCaptions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    // Load templates from JSON file
    const loadTemplates = async () => {
      try {
        const response = await fetch('/api/templates');
        const data = await response.json();
        setTemplates(data.templates);
        if (data.templates.length > 0) {
          setTemplateId(data.templates[0].id);
          setCaptions(Array(data.templates[0].box_count).fill(''));
        }
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };

    loadTemplates();
  }, []);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setTemplateId(id);
    const template = templates.find((t: Template) => t.id === id);
    if (template) {
      setCaptions(Array(template.box_count).fill(''));
    }
  };

  const handleCaptionChange = (index: number, value: string) => {
    const newCaptions = [...captions];
    newCaptions[index] = value;
    setCaptions(newCaptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      onSubmit({
        templateId,
        captions
      });
    } catch (error) {
      console.error('Error generating meme:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="template" className="block text-sm font-medium mb-2">
            Select Meme Template
          </label>
          <select
            id="template"
            value={templateId}
            onChange={handleTemplateChange}
            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700"
            disabled={loading}
          >
            {templates.map((template: Template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {captions.map((caption: string, index: number) => (
          <div key={index} className="mb-4">
            <label htmlFor={`caption-${index}`} className="block text-sm font-medium mb-2">
              Caption {index + 1}
            </label>
            <input
              type="text"
              id={`caption-${index}`}
              value={caption}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCaptionChange(index, e.target.value)}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700"
              placeholder={`Enter caption ${index + 1}`}
              disabled={loading}
              required
            />
          </div>
        ))}

        <div className="mt-6">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-300"
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Meme'}
          </button>
        </div>
      </form>
    </div>
  );
}