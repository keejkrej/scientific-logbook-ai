from langchain.agents import initialize_agent, Tool
from langchain.agents import AgentType
from langchain_openai import ChatOpenAI
from langchain_community.llms import LlamaCpp
from langchain_community.chat_models import ChatOllama
from langchain.schema import BaseMessage
from langchain.tools import BaseTool
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.language_models.llms import LLM
from langchain_core.callbacks import CallbackManagerForLLMRun
from typing import List, Dict, Any, Optional
import json
from datetime import datetime, timedelta
import os
import requests
from dotenv import load_dotenv

load_dotenv()

class LMStudioChat(LLM):
    """LangChain-compatible wrapper for LM Studio API"""
    
    base_url: str = "http://127.0.0.1:1234"
    model: str = "gemma-3-12b"
    temperature: float = 0.1
    
    def __init__(self, base_url: str = "http://127.0.0.1:1234", model: str = "gemma-3-12b", temperature: float = 0.1, **kwargs):
        super().__init__(**kwargs)
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.temperature = temperature
    
    @property
    def _llm_type(self) -> str:
        return "lm_studio"
    
    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        try:
            response = requests.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": self.temperature,
                    "max_tokens": 2000,
                    "stop": stop or []
                },
                headers={"Content-Type": "application/json"},
                timeout=60
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"LM Studio API error: {e}")
            return f"Error connecting to local model: {str(e)}"
    
    def invoke(self, input_data, config=None, **kwargs):
        """For compatibility with invoke() calls"""
        if isinstance(input_data, str):
            prompt = input_data
        else:
            # Handle PromptValue or other message formats
            prompt = str(input_data)
        return self._call(prompt, **kwargs)

class LogbookQueryTool(BaseTool):
    name: str = "logbook_query"
    description: str = "Query logbook entries to find specific information about experiments, results, or activities"
    entries: List[Dict[str, Any]] = []
    
    def __init__(self, entries: List[Dict[str, Any]], **kwargs):
        super().__init__(**kwargs)
        self.entries = entries
    
    def _run(self, query: str) -> str:
        """Execute the query on logbook entries"""
        # Simple text search for now - could be enhanced with vector search
        matching_entries = []
        query_lower = query.lower()
        
        for entry in self.entries:
            # Search in various fields
            searchable_text = f"{entry.get('title', '')} {entry.get('content', '')} {' '.join(entry.get('tags', []))}"
            if query_lower in searchable_text.lower():
                matching_entries.append(entry)
        
        if not matching_entries:
            return "No matching entries found."
        
        # Format results
        result = f"Found {len(matching_entries)} matching entries:\n\n"
        for entry in matching_entries[:5]:  # Limit to first 5 results
            result += f"**{entry['title']}** by {entry['author']} ({entry['date']})\n"
            result += f"{entry['content'][:200]}...\n\n"
        
        return result

class UserActivityTool(BaseTool):
    name: str = "user_activity"
    description: str = "Get activities and experiments for a specific user"
    entries: List[Dict[str, Any]] = []
    
    def __init__(self, entries: List[Dict[str, Any]], **kwargs):
        super().__init__(**kwargs)
        self.entries = entries
    
    def _run(self, user_name: str) -> str:
        """Get activities for a specific user"""
        user_entries = [entry for entry in self.entries if entry['author'].lower() == user_name.lower()]
        
        if not user_entries:
            return f"No entries found for user: {user_name}"
        
        # Sort by date (newest first)
        user_entries.sort(key=lambda x: x['date'], reverse=True)
        
        result = f"Activities for {user_name} ({len(user_entries)} entries):\n\n"
        for entry in user_entries[:10]:  # Limit to recent 10 entries
            result += f"**{entry['date']}**: {entry['title']}\n"
            if entry.get('experiments'):
                result += f"  Experiments: {len(entry['experiments'])}\n"
            if entry.get('results'):
                result += f"  Results: {len(entry['results'])}\n"
            result += "\n"
        
        return result

class TeamSummaryTool(BaseTool):
    name: str = "team_summary"
    description: str = "Generate a summary of team scientific activities"
    entries: List[Dict[str, Any]] = []
    
    def __init__(self, entries: List[Dict[str, Any]], **kwargs):
        super().__init__(**kwargs)
        self.entries = entries
    
    def _run(self, time_period: str = "week") -> str:
        """Generate team activity summary"""
        # Calculate date range
        now = datetime.now()
        if time_period == "week":
            start_date = now - timedelta(days=7)
        elif time_period == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=7)  # Default to week
        
        # Filter entries by date
        recent_entries = []
        for entry in self.entries:
            try:
                entry_date = datetime.strptime(entry['date'], '%Y-%m-%d')
                if entry_date >= start_date:
                    recent_entries.append(entry)
            except:
                continue
        
        if not recent_entries:
            return f"No activities found in the last {time_period}."
        
        # Group by author
        author_activities = {}
        for entry in recent_entries:
            author = entry['author']
            if author not in author_activities:
                author_activities[author] = []
            author_activities[author].append(entry)
        
        # Generate summary
        result = f"Team Activity Summary - Last {time_period.title()}:\n\n"
        result += f"Total entries: {len(recent_entries)}\n"
        result += f"Active researchers: {len(author_activities)}\n\n"
        
        for author, entries in author_activities.items():
            result += f"**{author}** ({len(entries)} entries):\n"
            for entry in entries[:3]:  # Show top 3 per person
                result += f"  - {entry['date']}: {entry['title']}\n"
            if len(entries) > 3:
                result += f"  ... and {len(entries) - 3} more\n"
            result += "\n"
        
        return result

class ScientificLogbookAgent:
    def __init__(self, model_type: str = "openai"):
        self.model_type = model_type
        self.switch_model(model_type)
    
    def switch_model(self, model_type: str):
        """Switch between OpenAI and local LM Studio model"""
        self.model_type = model_type
        
        if model_type == "local":
            self.llm = LMStudioChat(
                base_url="http://127.0.0.1:1234",
                model="gemma-3-12b",
                temperature=0.1
            )
        else:  # default to openai
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",  # Updated to a more recent model
                temperature=0.1,
                openai_api_key=os.getenv("OPENAI_API_KEY")
            )
        
    def _create_tools(self, entries: List[Dict[str, Any]]) -> List[BaseTool]:
        """Create tools with current entries"""
        return [
            LogbookQueryTool(entries),
            UserActivityTool(entries),
            TeamSummaryTool(entries)
        ]
    
    def query(self, query: str, entries: List[Dict[str, Any]], user_filter: Optional[str] = None) -> str:
        """Answer a query about the logbook entries"""
        try:
            # Filter entries by user if specified
            if user_filter:
                entries = [entry for entry in entries if entry['author'].lower() == user_filter.lower()]
            
            # Create tools with current entries
            tools = self._create_tools(entries)
            
            # Initialize agent
            agent = initialize_agent(
                tools,
                self.llm,
                agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
                verbose=True,
                handle_parsing_errors=True
            )
            
            # Add context to the query
            context = f"You are helping analyze scientific logbook entries. "
            context += f"There are {len(entries)} entries available. "
            if user_filter:
                context += f"Results are filtered for user: {user_filter}. "
            context += f"User query: {query}"
            
            # Get response from agent
            response = agent.run(context)
            return response
            
        except Exception as e:
            return f"Error processing query: {str(e)}"
    
    def generate_summary(self, entries: List[Dict[str, Any]]) -> str:
        """Generate a comprehensive summary of scientific activities"""
        if not entries:
            return "No logbook entries available."
        
        # Prepare data for summary
        total_entries = len(entries)
        authors = list(set([entry['author'] for entry in entries]))
        recent_entries = [entry for entry in entries if self._is_recent(entry['date'])]
        
        # Extract key metrics
        total_experiments = sum(len(entry.get('experiments', [])) for entry in entries)
        total_results = sum(len(entry.get('results', [])) for entry in entries)
        
        # Use LLM to generate narrative summary
        prompt = PromptTemplate(
            input_variables=["entries", "total_entries", "authors", "recent_entries", "total_experiments", "total_results"],
            template="""
            Generate a comprehensive summary of scientific activities based on the following logbook data:

            Statistics:
            - Total entries analyzed: {total_entries}
            - Active researchers: {authors}
            - Latest entries (up to 5 most recent): {recent_entries}
            - Total experiments: {total_experiments}
            - Total results: {total_results}

            Latest entries sample:
            {entries}

            Please provide a well-structured summary that includes:
            1. Overview of recent research activity
            2. Key research areas and trends from the latest work
            3. Individual researcher contributions
            4. Notable experiments and findings
            5. Recommendations for future work

            Focus on the most recent activities and keep the summary concise but informative.
            """
        )
        
        # Prepare sample entries for context (limited to available entries)
        sample_entries = []
        for entry in entries[:5]:  # Use the entries passed in (already limited to 5)
            sample_entries.append({
                "author": entry['author'],
                "date": entry['date'],
                "title": entry['title'],
                "summary": entry['content'][:200] + "..."
            })
        
        stats = {
            "total_entries": total_entries,
            "authors": len(authors),
            "recent_entries": len(recent_entries),
            "total_experiments": total_experiments,
            "total_results": total_results
        }
        
        try:
            chain = prompt | self.llm | StrOutputParser()
            summary = chain.invoke({
                "entries": json.dumps(sample_entries, indent=2),
                "total_entries": stats["total_entries"],
                "authors": stats["authors"],
                "recent_entries": stats["recent_entries"],
                "total_experiments": stats["total_experiments"],
                "total_results": stats["total_results"]
            })
            return summary
        except Exception as e:
            return f"Error generating summary: {str(e)}"
    
    def _is_recent(self, date_str: str, days: int = 30) -> bool:
        """Check if a date is within the last N days"""
        try:
            entry_date = datetime.strptime(date_str, '%Y-%m-%d')
            return (datetime.now() - entry_date).days <= days
        except:
            return False
    
    def refine_entry(self, author: str, title: str, rough_description: str, tags: List[str]) -> str:
        """Refine a rough description into a well-formatted scientific logbook entry"""
        
        prompt = PromptTemplate(
            input_variables=["author", "title", "rough_description", "tags"],
            template="""
            You are a scientific writing assistant. Transform the rough description below into a well-structured, professional scientific logbook entry in markdown format.

            Author: {author}
            Title: {title}
            Rough Description: {rough_description}
            Tags: {tags}

            Please create a properly formatted markdown entry with the following structure:
            
            # [Title]
            
            ## Experiment
            [Detailed description of the experimental procedure, methods, and setup]
            
            ## Results
            [Clear presentation of results, measurements, observations]
            
            ## Observations
            [Notable observations, unexpected findings, or important notes]
            
            ## Next Steps
            [Suggested follow-up experiments or actions]

            Guidelines:
            - Use proper scientific terminology and clear, concise language
            - Organize information logically into appropriate sections
            - Include specific details like measurements, conditions, parameters where relevant
            - If the rough description lacks specific details, suggest what information would be valuable to record
            - Maintain scientific objectivity and precision
            - Use proper markdown formatting (headers, lists, emphasis where appropriate)
            - Don't include YAML frontmatter - just the markdown content

            Return only the refined markdown content, nothing else.
            """
        )
        
        try:
            chain = prompt | self.llm | StrOutputParser()
            refined_content = chain.invoke({
                "author": author,
                "title": title,
                "rough_description": rough_description,
                "tags": ", ".join(tags) if tags else "None"
            })
            return refined_content.strip()
        except Exception as e:
            return f"Error refining entry: {str(e)}"