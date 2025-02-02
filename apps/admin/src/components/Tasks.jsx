import React, { useState, useEffect } from 'react';

const Tasks = ({ userRole }) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    id: '',
    url: '',
    frequency: 3600, // 1 hour in seconds
    filters: '',
    topics: ''
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await window.adminActor.getTasks();
      setTasks(response);
    } catch (error) {
      setError('Failed to fetch tasks');
      console.error(error);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const taskConfig = {
        url: newTask.url,
        frequency: Number(newTask.frequency),
        filters: newTask.filters.split(',').map(f => f.trim()),
        topics: newTask.topics.split(',').map(t => t.trim())
      };

      await window.adminActor.createTask(newTask.id, taskConfig);
      await fetchTasks();
      setNewTask({
        id: '',
        url: '',
        frequency: 3600,
        filters: '',
        topics: ''
      });
    } catch (error) {
      setError(error.message || 'Failed to add task');
      console.error(error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await window.adminActor.deleteTask(taskId);
      await fetchTasks();
    } catch (error) {
      setError('Failed to delete task');
      console.error(error);
    }
  };

  const formatNextRun = (timestamp) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {(userRole === 'SuperAdmin' || userRole === 'Admin') && (
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Add New Task</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create a new scraping task by specifying the source URL and configuration.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <form onSubmit={handleAddTask}>
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="id" className="block text-sm font-medium text-gray-700">
                      Task ID
                    </label>
                    <input
                      type="text"
                      name="id"
                      id="id"
                      value={newTask.id}
                      onChange={(e) => setNewTask({ ...newTask, id: e.target.value })}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                      Source URL
                    </label>
                    <input
                      type="url"
                      name="url"
                      id="url"
                      value={newTask.url}
                      onChange={(e) => setNewTask({ ...newTask, url: e.target.value })}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
                      Frequency (seconds)
                    </label>
                    <input
                      type="number"
                      name="frequency"
                      id="frequency"
                      value={newTask.frequency}
                      onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value })}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="filters" className="block text-sm font-medium text-gray-700">
                      Filters (comma-separated)
                    </label>
                    <input
                      type="text"
                      name="filters"
                      id="filters"
                      value={newTask.filters}
                      onChange={(e) => setNewTask({ ...newTask, filters: e.target.value })}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="topics" className="block text-sm font-medium text-gray-700">
                      Topics (comma-separated)
                    </label>
                    <input
                      type="text"
                      name="topics"
                      id="topics"
                      value={newTask.topics}
                      onChange={(e) => setNewTask({ ...newTask, topics: e.target.value })}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="mt-5">
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Manage Tasks
          </h3>
          <div className="mt-5">
            <div className="flex flex-col">
              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Source
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Next Run
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tasks.map((task) => (
                          <tr key={task.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {task.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {task.source}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                task.status === 'running' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {task.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatNextRun(task.nextRun)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {(userRole === 'SuperAdmin' || userRole === 'Admin') && (
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
