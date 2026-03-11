import React, { useState, useRef } from "react";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";

interface MessageData {
  type: "text" | "image" | "file";
  content: string;
  fileName?: string;
  fileSize?: string;
}

interface MessageInputProps {
  onSendMessage: (message: MessageData) => void;
  onTyping?: (typing: boolean) => void;
  isTyping?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const EMOJIS = ["😀","😂","😍","🤔","👍","👎","❤️","🔥","💯","🎉","😢","😡","🤝","👏","🙏","💪"];

const MessageInput = ({ onSendMessage, onTyping, isTyping = false, disabled = false, placeholder = "Type a message..." }: MessageInputProps) => {
  const [message, setMessage]               = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachmentMenu, setAttachmentMenu]   = useState(false);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage({ type: "text", content: message.trim() });
      setMessage("");
      onTyping?.(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping?.(e.target.value.length > 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      onSendMessage({
        type,
        content: event.target?.result as string,
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border-t border-border bg-card p-4">
      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex items-center space-x-2 mb-2 text-sm text-muted-foreground">
          <div className="flex space-x-1">
            {[0, 0.1, 0.2].map((delay, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <span>Someone is typing...</span>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="mb-4 p-3 bg-popover border border-border rounded-lg shadow-lg">
          <div className="grid grid-cols-8 gap-2">
            {EMOJIS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => { setMessage((p) => p + emoji); setShowEmojiPicker(false); }}
                className="p-2 hover:bg-accent/50 rounded-lg transition-colors duration-200 text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment Menu */}
      {attachmentMenu && (
        <div className="mb-4 p-2 bg-popover border border-border rounded-lg shadow-lg w-fit">
          <div className="space-y-1">
            <button
              onClick={() => { imageInputRef.current?.click(); setAttachmentMenu(false); }}
              className="flex items-center space-x-3 w-full p-2 hover:bg-accent/50 rounded-lg transition-colors duration-200"
            >
              <Icon name="Image" size={18} className="text-primary" />
              <span className="text-sm">Photo</span>
            </button>
            <button
              onClick={() => { fileInputRef.current?.click(); setAttachmentMenu(false); }}
              className="flex items-center space-x-3 w-full p-2 hover:bg-accent/50 rounded-lg transition-colors duration-200"
            >
              <Icon name="File" size={18} className="text-primary" />
              <span className="text-sm">Document</span>
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setAttachmentMenu(!attachmentMenu)}
          disabled={disabled}
        >
          <Icon name="Paperclip" size={20} />
        </Button>

        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder} 
            disabled={disabled}
            className="w-full px-4 py-3 pr-12 bg-input border border-border rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
            style={{ minHeight: "48px", maxHeight: "120px" }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <Icon name="Smile" size={18} />
          </Button>
        </div>

        <Button
          type="submit"
          disabled={!message.trim() || disabled}
          className="rounded-full w-12 h-12 flex-shrink-0"
        >
          <Icon name="Send" size={18} />
        </Button>
      </form>

      <input ref={fileInputRef}  type="file" accept="*/*"     onChange={(e) => handleFileChange(e, "file")}  className="hidden" />
      <input ref={imageInputRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, "image")} className="hidden" />
    </div>
  );
};

export default MessageInput;