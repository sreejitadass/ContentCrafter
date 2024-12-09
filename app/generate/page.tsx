"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import {
  Clock,
  Zap,
  PencilIcon,
  NewspaperIcon,
  ShoppingBagIcon,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const contentTypes = [
  { value: "blog", label: "Blog and Articles" },
  { value: "news", label: "News Campaigns" },
  { value: "product-marketing", label: "Product and Marketing Content" },
];

interface HistoryItem {
  id: number;
  contentType: string;
  prompt: string;
  content: string;
  createdAt: Date;
}

const MAX_ARTICLE_LENGTH = 1000;
const POINTS_PER_GENERATION = 5;

export default function GenerateContent() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [contentType, setContentType] = useState(contentTypes[0].value);
  const [generatedContent, setGeneratedContent] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userPoints, setUserPoints] = useState<number | null>(300);
  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<HistoryItem | null>(null);

  useEffect(() => {
    if (!apiKey) {
      console.error("Gemini API key is not set");
    }
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    } else if (isSignedIn && user) {
      console.log("User loaded:", user);
      fetchUserPoints();
      fetchContentHistory();
    }
  }, [isLoaded, isSignedIn, user, router]);

  const fetchUserPoints = async () => {
    if (user?.id) {
      console.log("Fetching points for user:", user.id);
      const response = await fetch(`/api/get-user-points?userId=${user.id}`);
      if (response.ok) {
        const { points } = await response.json();
        console.log("Fetched points:", points);
        setUserPoints(points);
        if (points === 0) {
          console.log("User has 0 points. Attempting to create/update user.");
          const updateResponse = await fetch("/api/create-or-update-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              email: user.emailAddresses[0].emailAddress,
              name: user.fullName || "",
            }),
          });

          const updatedUser = await updateResponse.json();
          console.log("Updated user:", updatedUser);
          if (updatedUser) {
            setUserPoints(updatedUser.points);
          }
        }
      }
    }
  };

  const fetchContentHistory = async () => {
    if (user?.id) {
      const response = await fetch(
        `/api/get-generated-content-history?userId=${user.id}`
      );
      if (response.ok) {
        const contentHistory = await response.json();
        setHistory(contentHistory);
      }
    }
  };

  const handleGenerate = async () => {
    if (
      !genAI ||
      !user?.id ||
      userPoints === null ||
      userPoints < POINTS_PER_GENERATION
    ) {
      alert("Not enough points or API key not set.");
      return;
    }

    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      let promptText = `Generate ${contentType} content about "${prompt}".`;

      if (contentType === "blog") {
        promptText +=
          " Write a detailed blog post that includes an engaging introduction, several informative sections, and a conclusion.";
      } else if (contentType === "news") {
        promptText +=
          " Create a compelling news campaign with a headline, subheading, and a well-structured narrative that captures attention.";
      } else if (contentType === "product-marketing") {
        promptText +=
          " Develop a persuasive product marketing piece with key selling points, target audience, and a call to action.";
      }
      console.log(promptText);

      let imagePart: Part | null = null;
      if (contentType === "product-marketing" && image) {
        const reader = new FileReader();
        const imageData = await new Promise<string>((resolve) => {
          reader.onload = (e) => {
            if (e.target && typeof e.target.result === "string") {
              resolve(e.target.result);
            } else {
              resolve("");
            }
          };
          reader.readAsDataURL(image);
        });

        const base64Data = imageData.split(",")[1];
        if (base64Data) {
          imagePart = {
            inlineData: {
              data: base64Data,
              mimeType: image.type,
            },
          };
        }
        promptText +=
          " Describe the image and incorporate it into the caption.";
      }
      const parts: (string | Part)[] = [promptText];
      if (imagePart) parts.push(imagePart);

      const result = await model.generateContent(parts);
      const generatedText = result.response.text();

      let content: string[];
      content = [generatedText];
      setGeneratedContent(content);

      // Update points
      const pointsResponse = await fetch("/api/update-user-points", {
        method: "POST",
        headers: {
          "Content-Type": "text/html",
        },
        body: JSON.stringify({
          userId: user.id,
          points: -POINTS_PER_GENERATION,
        }),
      });

      const updatedPoints = await pointsResponse.json();
      if (updatedPoints && updatedPoints.points !== null) {
        setUserPoints(updatedPoints.points);
      } else {
        setUserPoints(0);
      }

      // Save generated content
      const saveResponse = await fetch("/api/save-generated-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          content: content.join("\n\n"),
          prompt,
          contentType,
        }),
      });

      const savedContent = await saveResponse.json();
      if (savedContent) {
        setHistory((prevHistory) => [savedContent, ...prevHistory]);
      }
    } catch (error) {
      console.error("Error generating content:", error);
      setGeneratedContent(["An error occurred while generating content."]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistoryItemClick = (item: HistoryItem) => {
    setSelectedHistoryItem(item);
    setContentType(item.contentType);
    setPrompt(item.prompt);
    setGeneratedContent(
      item.contentType === "twitter"
        ? item.content.split("\n\n")
        : [item.content]
    );
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center bg-[#111111] p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-white mb-4">
            Welcome to ThreadCraft AI
          </h1>
          <p className="text-gray-400 mb-6">
            To start generating amazing content, please sign in or create an
            account.
          </p>
          <SignInButton mode="modal">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2">
              Sign In / Sign Up
            </Button>
          </SignInButton>
          <p className="text-gray-500 mt-4 text-sm">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    );
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImage(event.target.files[0]);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black min-h-screen text-white">
      <Navbar />
      <div className="container mx-auto px-4 mb-8 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 mt-14 lg:grid-cols-3 gap-8">
          {/* Left sidebar - History */}
          <div className="lg:col-span-1 bg-gray-800 rounded-2xl p-6 h-[calc(100vh-12rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-blue-400">History</h2>
              <Clock className="h-6 w-6 text-blue-400" />
            </div>
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors cursor-pointer"
                  onClick={() => handleHistoryItemClick(item)}
                >
                  <div className="flex items-center mb-2">
                    {item.contentType === "blog" && (
                      <PencilIcon className="mr-2 h-5 w-5 text-blue-400" />
                    )}
                    {item.contentType === "news" && (
                      <NewspaperIcon className="mr-2 h-5 w-5 text-pink-400" />
                    )}
                    {item.contentType === "product-marketing" && (
                      <ShoppingBagIcon className="mr-2 h-5 w-5 text-blue-600" />
                    )}
                    <span className="text-sm font-medium">
                      {item.contentType}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 truncate">
                    {item.prompt}
                  </p>
                  <div className="flex items-center text-xs text-gray-400 mt-2">
                    <Clock className="mr-1 h-3 w-3" />
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Points display */}
            <div className="bg-gray-800 p-6 rounded-2xl flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-yellow-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-400">Available Points</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {userPoints !== null ? userPoints : "Loading..."}
                  </p>
                </div>
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 rounded-full transition-colors"
                onClick={() => (window.location.href = "/pricing")}
              >
                Get More Points
              </Button>
            </div>

            {/* Content generation form */}
            <div className="bg-gray-800 p-6 rounded-2xl space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Content Type
                </label>
                <Select
                  onValueChange={setContentType}
                  defaultValue={contentType}
                >
                  <SelectTrigger className="w-full bg-gray-700 border-none rounded-xl">
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center">
                          {type.value === "blog" && (
                            <PencilIcon className="mr-2 h-4 w-4 text-blue-400" />
                          )}
                          {type.value === "news" && (
                            <NewspaperIcon className="mr-2 h-4 w-4 text-pink-400" />
                          )}
                          {type.value === "product-marketing" && (
                            <ShoppingBagIcon className="mr-2 h-4 w-4 text-blue-600" />
                          )}
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label
                  htmlFor="prompt"
                  className="block text-sm font-medium mb-2 text-gray-300"
                >
                  Prompt
                </label>
                <Textarea
                  id="prompt"
                  placeholder="Enter your prompt here..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-700 border-none rounded-xl resize-none"
                />
              </div>

              {contentType === "product-marketing" && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Upload Image
                  </label>
                  <div className="flex items-center space-x-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer flex items-center justify-center px-4 py-2 bg-gray-700 rounded-xl text-sm font-medium hover:bg-gray-600 transition-colors"
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      <span>Upload Product Image</span>
                    </label>
                    {image && (
                      <span className="text-sm text-gray-400">
                        {image.name}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={
                  isLoading ||
                  !prompt ||
                  userPoints === null ||
                  userPoints < POINTS_PER_GENERATION
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  `Generate Content (${POINTS_PER_GENERATION} points)`
                )}
              </Button>
            </div>

            {/* Generated content display */}
            <div className="bg-gray-700 p-4 rounded-xl">
              <ReactMarkdown className="prose prose-invert max-w-none text-sm">
                {selectedHistoryItem
                  ? selectedHistoryItem.content
                  : generatedContent[0]}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
