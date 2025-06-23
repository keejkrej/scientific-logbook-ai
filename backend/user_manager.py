import json
import os
from typing import List, Set

class UserManager:
    def __init__(self, users_file: str = "users.json"):
        self.users_file = users_file
        self._ensure_users_file()
    
    def _ensure_users_file(self):
        """Create users file if it doesn't exist"""
        if not os.path.exists(self.users_file):
            # Initialize with existing users from logbook directories if any
            initial_users = self._get_users_from_logbooks()
            self._save_users(initial_users)
    
    def _get_users_from_logbooks(self) -> List[str]:
        """Extract existing users from logbook directory structure"""
        users = set()
        logbooks_dir = "logbooks"
        
        if os.path.exists(logbooks_dir):
            for item in os.listdir(logbooks_dir):
                if os.path.isdir(os.path.join(logbooks_dir, item)):
                    # Convert directory name back to proper name
                    user_name = item.replace('_', ' ').title()
                    users.add(user_name)
        
        return sorted(list(users))
    
    def _load_users(self) -> List[str]:
        """Load users from JSON file"""
        try:
            with open(self.users_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('users', [])
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _save_users(self, users: List[str]):
        """Save users to JSON file"""
        with open(self.users_file, 'w', encoding='utf-8') as f:
            json.dump({'users': sorted(users)}, f, indent=2)
    
    def get_users(self) -> List[str]:
        """Get all users"""
        return self._load_users()
    
    def add_user(self, name: str) -> bool:
        """Add a new user if they don't exist"""
        name = name.strip()
        if not name:
            return False
        
        users = self._load_users()
        if name not in users:
            users.append(name)
            self._save_users(users)
            return True
        return False
    
    def remove_user(self, name: str) -> bool:
        """Remove a user"""
        users = self._load_users()
        if name in users:
            users.remove(name)
            self._save_users(users)
            return True
        return False