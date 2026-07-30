import { useState, useEffect } from 'react';
import './App.css';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  editing: boolean;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTodo, setNewTodo] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Save to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (newTodo.trim() === '') return;
    
    const newTodoItem: Todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      editing: false,
    };
    
    setTodos(prev => [...prev, newTodoItem]);
    setNewTodo('');
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => 
      prev.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = (id: string) => {
    if (editText.trim() === '') return;
    
    setTodos(prev => 
      prev.map(todo => 
        todo.id === id ? { ...todo, text: editText.trim() } : todo
      )
    );
    
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const clearCompleted = () => {
    setTodos(prev => prev.filter(todo => !todo.completed));
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.length - activeCount;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📝 Todo List</h1>
      </header>
      
      <main className="app-main">
        <div className="input-section">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a new task..."
            className="todo-input"
          />
          <button onClick={addTodo} className="add-button">
            Add
          </button>
        </div>
        
        <div className="filter-section">
          <button 
            onClick={() => setFilter('all')}
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('active')}
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          >
            Active
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          >
            Completed
          </button>
        </div>
        
        <div className="todos-container">
          {filteredTodos.length === 0 ? (
            <div className="empty-state">
              <p>No tasks found. {filter === 'all' ? 'Add your first task!' : `Try switching to 'All' filter.`}</p>
            </div>
          ) : (
            <ul className="todo-list">
              {filteredTodos.map((todo) => (
                <li 
                  key={todo.id} 
                  className={`todo-item ${todo.completed ? 'completed' : ''} ${editingId === todo.id ? 'editing' : ''}`}
                >
                  {editingId === todo.id ? (
                    <div className="edit-form">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveEdit(todo.id)}
                        autoFocus
                        className="edit-input"
                      />
                      <div className="edit-actions">
                        <button 
                          onClick={() => saveEdit(todo.id)}
                          className="save-btn"
                        >
                          Save
                        </button>
                        <button 
                          onClick={cancelEdit}
                          className="cancel-btn"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="todo-content">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                        className="todo-checkbox"
                      />
                      <span 
                        className="todo-text"
                        onDoubleClick={() => startEditing(todo)}
                      >
                        {todo.text}
                      </span>
                      <div className="todo-actions">
                        <button 
                          onClick={() => startEditing(todo)}
                          className="edit-btn"
                          aria-label="Edit todo"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => deleteTodo(todo.id)}
                          className="delete-btn"
                          aria-label="Delete todo"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="stats-section">
          <span className="stats-text">
            {activeCount} {activeCount === 1 ? 'task' : 'tasks'} left
          </span>
          {todos.length > 0 && (
            <button 
              onClick={clearCompleted}
              className="clear-btn"
            >
              Clear completed ({completedCount})
            </button>
          )}
        </div>
      </main>
      
      <footer className="app-footer">
        <p>Double-click a task to edit it • Drag and drop to reorder</p>
      </footer>
    </div>
  );
}

export default App;
