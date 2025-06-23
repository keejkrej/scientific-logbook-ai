'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModeToggle } from '@/components/mode-toggle';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Users, FileText, TrendingUp, Plus, UserPlus, Database, BarChart3, Wand2, Check, Cpu, Cloud } from 'lucide-react';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/markdown-renderer';

interface LogbookEntry {
  author: string;
  date: string;
  title: string;
  content: string;
  tags: string[];
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryUserFilter, setSummaryUserFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [addUserLoading, setAddUserLoading] = useState(false);
  
  // Add Entry tab state
  const [newEntryAuthor, setNewEntryAuthor] = useState('');
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryDescription, setNewEntryDescription] = useState('');
  const [newEntryTags, setNewEntryTags] = useState<string[]>([]);
  const [newEntryTagInput, setNewEntryTagInput] = useState('');
  const [newEntryRefinedContent, setNewEntryRefinedContent] = useState('');
  const [newEntryLoading, setNewEntryLoading] = useState(false);
  const [newEntrySuccess, setNewEntrySuccess] = useState(false);
  const [newEntryShowPreview, setNewEntryShowPreview] = useState(false);
  
  // Model configuration state
  const [currentModel, setCurrentModel] = useState('openai');
  const [modelSwitching, setModelSwitching] = useState(false);

  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    fetchEntries();
    fetchUsers();
    fetchModelConfig();
  }, []);

  const fetchModelConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/model-config`);
      const data = await res.json();
      setCurrentModel(data.type);
    } catch {
      // Default to openai if fetch fails
      setCurrentModel('openai');
    }
  };

  const fetchEntries = async () => {
    try {
      const res = await fetch(`${API_BASE}/entries`);
      const data = await res.json();
      setEntries(data);
    } catch {
      setError('Failed to fetch entries');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError('Failed to fetch users');
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const url = `${API_BASE}/summary${summaryUserFilter !== 'all' ? `?user_filter=${summaryUserFilter}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      setSummary(data.summary);
    } catch {
      setError('Failed to fetch summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const addUser = async () => {
    if (!newUserName.trim()) return;

    setAddUserLoading(true);
    try {
      const response = await fetch(`${API_BASE}/add-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newUserName.trim(),
        }),
      });

      if (response.ok) {
        await fetchUsers(); // Refresh user list
        setNewUserName('');
        setShowAddUser(false);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to add user');
      }
    } catch {
      setError('Failed to add user');
    } finally {
      setAddUserLoading(false);
    }
  };

  const addNewEntryTag = () => {
    if (newEntryTagInput.trim() && !newEntryTags.includes(newEntryTagInput.trim())) {
      setNewEntryTags([...newEntryTags, newEntryTagInput.trim()]);
      setNewEntryTagInput('');
    }
  };

  const removeNewEntryTag = (tagToRemove: string) => {
    setNewEntryTags(newEntryTags.filter(tag => tag !== tagToRemove));
  };

  const handleNewEntryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewEntryTag();
    }
  };

  const submitNewEntry = async () => {
    if (!newEntryAuthor.trim() || !newEntryTitle.trim() || !newEntryDescription.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setNewEntryLoading(true);
    setError('');
    setNewEntrySuccess(false);

    try {
      const response = await fetch(`${API_BASE}/create-entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          author: newEntryAuthor.trim(),
          title: newEntryTitle.trim(),
          rough_description: newEntryDescription.trim(),
          tags: newEntryTags,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setNewEntryRefinedContent(data.refined_content);
        setNewEntrySuccess(true);
        setNewEntryShowPreview(true);
        // Refresh entries list
        await fetchEntries();
      } else {
        setError(data.detail || 'Failed to create entry');
      }
    } catch {
      setError('Failed to create entry. Please check your connection.');
    } finally {
      setNewEntryLoading(false);
    }
  };

  const resetNewEntryForm = () => {
    setNewEntryAuthor('');
    setNewEntryTitle('');
    setNewEntryDescription('');
    setNewEntryTags([]);
    setNewEntryTagInput('');
    setNewEntryRefinedContent('');
    setNewEntrySuccess(false);
    setError('');
    setNewEntryShowPreview(false);
  };

  const switchModel = async () => {
    const newModel = currentModel === 'openai' ? 'local' : 'openai';
    setModelSwitching(true);
    
    try {
      const response = await fetch(`${API_BASE}/model-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_type: newModel,
        }),
      });

      if (response.ok) {
        setCurrentModel(newModel);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to switch model');
      }
    } catch {
      setError('Failed to switch model');
    } finally {
      setModelSwitching(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          user_filter: selectedUser && selectedUser !== 'all' ? selectedUser : undefined,
        }),
      });
      
      const data = await res.json();
      setResponse(data.response);
    } catch {
      setError('Failed to query logbooks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-7xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Scientific Logbook AI</h1>
            <p className="text-muted-foreground mt-2">Query and summarize scientific logbook entries with AI</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={switchModel}
              variant="outline"
              size="sm"
              disabled={modelSwitching}
              className="flex items-center gap-2"
            >
              {modelSwitching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentModel === 'local' ? (
                <Cpu className="h-4 w-4" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {currentModel === 'local' ? 'Gemma-3-12B' : 'GPT-4o-mini'}
              </span>
            </Button>
            <ModeToggle />
          </div>
        </header>

        {error && (
          <Alert className="mb-6 border-destructive bg-destructive/10">
            <AlertDescription className="text-destructive-foreground">
              {error}
            </AlertDescription>
          </Alert>
        )}


        <Tabs defaultValue="add" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="add" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Entry</span>
            </TabsTrigger>
            <TabsTrigger value="query" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Query</span>
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Browse</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Summary</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="add" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create New Entry
                  </CardTitle>
                  <CardDescription>
                    Describe your experiment and let AI format it professionally
                    <Badge variant="secondary" className="ml-2">
                      {currentModel === 'local' ? (
                        <>
                          <Cpu className="h-3 w-3 mr-1" />
                          Gemma-3-12B
                        </>
                      ) : (
                        <>
                          <Cloud className="h-3 w-3 mr-1" />
                          GPT-4o-mini
                        </>
                      )}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-entry-author">Author *</Label>
                      <Select value={newEntryAuthor} onValueChange={setNewEntryAuthor} disabled={newEntryLoading || newEntrySuccess}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select author" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user} value={user}>{user}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-entry-title">Title *</Label>
                      <Input
                        id="new-entry-title"
                        value={newEntryTitle}
                        onChange={(e) => setNewEntryTitle(e.target.value)}
                        placeholder="Experiment title"
                        disabled={newEntryLoading || newEntrySuccess}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-entry-tags">Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newEntryTagInput}
                        onChange={(e) => setNewEntryTagInput(e.target.value)}
                        placeholder="Add tags (press Enter)"
                        onKeyPress={handleNewEntryKeyPress}
                        disabled={newEntryLoading || newEntrySuccess}
                      />
                      <Button 
                        onClick={addNewEntryTag} 
                        variant="outline" 
                        size="sm"
                        disabled={newEntryLoading || newEntrySuccess}
                      >
                        Add
                      </Button>
                    </div>
                    {newEntryTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newEntryTags.map((tag) => (
                          <Badge 
                            key={tag} 
                            variant="secondary" 
                            className="cursor-pointer"
                            onClick={() => !newEntryLoading && !newEntrySuccess && removeNewEntryTag(tag)}
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-entry-description">Rough Description *</Label>
                    <Textarea
                      id="new-entry-description"
                      value={newEntryDescription}
                      onChange={(e) => setNewEntryDescription(e.target.value)}
                      placeholder="Describe your experiment in your own words... The AI will help format it properly."
                      className="min-h-[200px]"
                      disabled={newEntryLoading || newEntrySuccess}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={submitNewEntry}
                      disabled={newEntryLoading || !newEntryAuthor.trim() || !newEntryTitle.trim() || !newEntryDescription.trim()}
                      size="lg"
                    >
                      {newEntryLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          AI is refining...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Create Entry
                        </>
                      )}
                    </Button>
                    
                    {newEntrySuccess && (
                      <Button onClick={resetNewEntryForm} variant="outline" size="lg">
                        New Entry
                      </Button>
                    )}
                  </div>

                  {newEntrySuccess && (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                      <Check className="h-4 w-4" />
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        Entry created and saved successfully!
                      </AlertDescription>
                    </Alert>
                  )}

                  {newEntryShowPreview && (
                    <div className="space-y-2">
                      <Label>AI-Refined Entry Preview</Label>
                      <div className="bg-muted p-4 rounded-lg max-h-[400px] overflow-y-auto border">
                        <MarkdownRenderer content={newEntryRefinedContent} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="query" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Query Logbooks
                  </CardTitle>
                  <CardDescription>
                    Ask questions about scientific experiments and findings using AI
                    <Badge variant="secondary" className="ml-2">
                      {currentModel === 'local' ? (
                        <>
                          <Cpu className="h-3 w-3 mr-1" />
                          Gemma-3-12B
                        </>
                      ) : (
                        <>
                          <Cloud className="h-3 w-3 mr-1" />
                          GPT-4o-mini
                        </>
                      )}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-filter">Filter by User (optional)</Label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger>
                          <SelectValue placeholder="All users" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All users</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user} value={user}>{user}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="query">Your Question</Label>
                    <Textarea
                      id="query"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Ask about the scientific work... (e.g., 'What experiments were done on protein crystallization?')"
                      className="min-h-[120px]"
                    />
                  </div>

                  <Button
                    onClick={handleQuery}
                    disabled={loading || !query.trim()}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Query Logbooks
                      </>
                    )}
                  </Button>

                  {response && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-lg">AI Response</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MarkdownRenderer content={response} />
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="browse" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    All Logbook Entries
                  </CardTitle>
                  <CardDescription>
                    Browse all scientific logbook entries from researchers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {entries.map((entry, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-base">{entry.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {entry.date}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          By: <span className="font-medium">{entry.author}</span>
                        </p>
                        <div className="text-sm text-foreground/90 line-clamp-3 mb-3">
                          <MarkdownRenderer content={entry.content} className="text-sm" />
                        </div>
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entry.tags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                  {entries.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No entries found. Create your first entry to get started!
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Research Summary
                  </CardTitle>
                  <CardDescription>
                    AI-generated overview of recent research activities and trends
                    <Badge variant="secondary" className="ml-2">
                      {currentModel === 'local' ? (
                        <>
                          <Cpu className="h-3 w-3 mr-1" />
                          Gemma-3-12B
                        </>
                      ) : (
                        <>
                          <Cloud className="h-3 w-3 mr-1" />
                          GPT-4o-mini
                        </>
                      )}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="summary-user-filter">Filter by User (optional)</Label>
                        <Select value={summaryUserFilter} onValueChange={setSummaryUserFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All users" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All users</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user} value={user}>{user}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {!summary ? (
                      <div className="text-center py-12">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Generate Research Summary</h3>
                        <p className="text-muted-foreground mb-6">
                          Get an AI-powered analysis of recent scientific activities and insights
                        </p>
                        <Button
                          onClick={fetchSummary}
                          disabled={summaryLoading}
                          size="lg"
                        >
                          {summaryLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating summary...
                            </>
                          ) : (
                            <>
                              <TrendingUp className="mr-2 h-4 w-4" />
                              Generate Summary
                            </>
                          )}
                        </Button>
                      </div>
                  ) : (
                    <div>
                      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                        <MarkdownRenderer content={summary} />
                      </div>
                      <Button
                        onClick={() => {
                          setSummary('');
                          fetchSummary();
                        }}
                        variant="outline"
                        disabled={summaryLoading}
                      >
                        {summaryLoading ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="mr-2 h-3 w-3" />
                            Refresh Summary
                          </>
                        )}
                      </Button>
                    </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Manage research team members and their contributions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Active Researchers</h3>
                      <Button
                        onClick={() => setShowAddUser(true)}
                        size="sm"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </div>

                    {showAddUser && (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <div className="flex gap-3 items-end">
                            <div className="flex-1 space-y-2">
                              <Label htmlFor="newUser">User Name</Label>
                              <Input
                                id="newUser"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                placeholder="Enter full name"
                                onKeyPress={(e) => e.key === 'Enter' && addUser()}
                                disabled={addUserLoading}
                              />
                            </div>
                            <Button
                              onClick={addUser}
                              disabled={!newUserName.trim() || addUserLoading}
                            >
                              {addUserLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Add'
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setShowAddUser(false);
                                setNewUserName('');
                              }}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {users.map((user) => (
                        <div key={user} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{user}</p>
                              <p className="text-sm text-muted-foreground">
                                {entries.filter(e => e.author === user).length} entries
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            {entries.filter(e => e.author === user).length}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {users.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No users found. Add your first researcher to get started!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
