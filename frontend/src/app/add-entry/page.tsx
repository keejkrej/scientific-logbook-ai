'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModeToggle } from '@/components/mode-toggle';
import { Loader2, Plus, ArrowLeft, Check, Wand2, FileText, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function AddEntry() {
  const [author, setAuthor] = useState('');
  const [users, setUsers] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [roughDescription, setRoughDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [refinedContent, setRefinedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [addUserLoading, setAddUserLoading] = useState(false);

  const API_BASE = '/api';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError('Failed to fetch users');
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
        setAuthor(newUserName.trim()); // Select the new user
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

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = async () => {
    if (!author.trim() || !title.trim() || !roughDescription.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${API_BASE}/create-entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          author: author.trim(),
          title: title.trim(),
          rough_description: roughDescription.trim(),
          tags: tags,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setRefinedContent(data.refined_content);
        setSuccess(true);
        setShowPreview(true);
      } else {
        setError(data.detail || 'Failed to create entry');
      }
    } catch {
      setError('Failed to create entry. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAuthor('');
    setTitle('');
    setRoughDescription('');
    setTags([]);
    setTagInput('');
    setRefinedContent('');
    setSuccess(false);
    setError('');
    setShowPreview(false);
    setShowAddUser(false);
    setNewUserName('');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-7xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Add New Entry</h1>
            <p className="text-muted-foreground mt-2">Create a scientific logbook entry with AI assistance</p>
          </div>
          <ModeToggle />
        </header>

        {error && (
          <Alert className="mb-6 border-destructive bg-destructive/10">
            <AlertDescription className="text-destructive-foreground">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <Check className="h-4 w-4" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Entry created and saved successfully!
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Entry Details
              </CardTitle>
              <CardDescription>
                Provide basic information about your experiment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="author">Author *</Label>
                <div className="flex gap-2">
                  <Select value={author} onValueChange={setAuthor} disabled={loading || success}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select author" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user} value={user}>{user}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => setShowAddUser(true)}
                    variant="outline"
                    size="icon"
                    disabled={loading || success}
                    title="Add new user"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {showAddUser && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <Label htmlFor="newUser">Add New User</Label>
                      <div className="flex gap-2">
                        <Input
                          id="newUser"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Enter user name"
                          onKeyPress={(e) => e.key === 'Enter' && addUser()}
                          disabled={addUserLoading}
                        />
                        <Button
                          onClick={addUser}
                          disabled={!newUserName.trim() || addUserLoading}
                          size="sm"
                        >
                          {addUserLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
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
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Experiment title"
                  disabled={loading || success}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tags (press Enter)"
                    onKeyPress={handleKeyPress}
                    disabled={loading || success}
                  />
                  <Button 
                    onClick={addTag} 
                    variant="outline" 
                    size="sm"
                    disabled={loading || success}
                  >
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="cursor-pointer"
                        onClick={() => !loading && !success && removeTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Rough Description *</Label>
                <Textarea
                  id="description"
                  value={roughDescription}
                  onChange={(e) => setRoughDescription(e.target.value)}
                  placeholder="Describe your experiment in your own words... The AI will help format it properly."
                  className="min-h-[200px]"
                  disabled={loading || success}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !author.trim() || !title.trim() || !roughDescription.trim()}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? (
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
                
                {success && (
                  <Button onClick={resetForm} variant="outline" size="lg">
                    New Entry
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {showPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  AI-Refined Entry
                </CardTitle>
                <CardDescription>
                  Your entry has been formatted and enhanced by AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg max-h-[500px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {refinedContent}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}