import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useState, useRef, useEffect } from 'react';
import { Plus, Camera, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Wrench, TestTube, UserPlus, Link, Power, PowerOff, Eye, Loader } from 'lucide-react';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Table from '../../components/Table';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useNavigate } from 'react-router-dom';

const LOCAL_WEBCAM_TYPES = ['usb_webcam', 'laptop_webcam'];

const Cameras = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [deleteCamera, setDeleteCamera] = useState(null);
  const [testingCamera, setTestingCamera] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);
  const videoRef = useRef(null);
  
  // Face detection preview state
  const [previewingCamera, setPreviewingCamera] = useState(null);
  const [previewLiveData, setPreviewLiveData] = useState(null);
  const [previewStreamError, setPreviewStreamError] = useState(null);
  const [isPreviewStreaming, setIsPreviewStreaming] = useState(false);
  const previewEventSourceRef = useRef(null);
  const previewImageRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'ip_camera',
    endpointUrl: '',
    ipAddress: '',
    port: '',
    session: '',
    location: '',
    locationTag: '',
    username: '',
    password: '',
    description: '',
    isActive: true,
    isUnderMaintenance: false
  });

  const { data: cameras, isLoading, refetch } = useQuery({
    queryKey: ['cameras'],
    queryFn: async () => {
      const response = await api.get('/cameras');
      return response.data.data || [];
    }
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/settings/branches');
      return response.data.data || [];
    }
  });

  // Get assignments count for each camera
  const { data: assignments } = useQuery({
    queryKey: ['camera-assignments'],
    queryFn: async () => {
      const response = await api.get('/camera-assignments');
      return response.data.data || [];
    }
  });

  // Check monitoring status for preview
  const { data: monitoringStatus } = useQuery({
    queryKey: ['monitoring-status', previewingCamera?._id],
    queryFn: async () => {
      try {
        const response = await api.get('/camera-monitoring/status');
        return response.data;
      } catch (error) {
        return { data: [] };
      }
    },
    enabled: !!previewingCamera?._id,
    refetchInterval: 5000
  });

  const isMonitoringActiveForPreview = monitoringStatus?.data?.some(m => m.cameraId === previewingCamera?._id);

  // SSE connection for face detection preview
  useEffect(() => {
    if (!previewingCamera?._id) {
      // Close any existing connection
      if (previewEventSourceRef.current) {
        previewEventSourceRef.current.close();
        previewEventSourceRef.current = null;
      }
      setIsPreviewStreaming(false);
      setPreviewLiveData(null);
      setPreviewStreamError(null);
      return;
    }

    const camera = previewingCamera;
    const isLocalWebcam = camera?.type === 'usb_webcam' || camera?.type === 'laptop_webcam';
    
    if (isLocalWebcam) {
      setPreviewStreamError('Local webcams cannot be previewed from the server');
      setIsPreviewStreaming(false);
      return;
    }

    if (!isMonitoringActiveForPreview) {
      setPreviewStreamError('Camera monitoring must be active to view preview. Please start monitoring from the Real-Time Attendance page first.');
      setIsPreviewStreaming(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setPreviewStreamError('Authentication required');
      return;
    }

    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://vaalboss.onrender.com' : window.location.origin);
    const streamUrl = `${apiBase}/api/cameras/${camera._id}/live-stream?interval=1000&token=${encodeURIComponent(token)}`;
    
    const eventSource = new EventSource(streamUrl);
    previewEventSourceRef.current = eventSource;
    setIsPreviewStreaming(true);
    setPreviewStreamError(null);

    eventSource.onopen = () => {
      console.log('Preview SSE connection opened');
      setIsPreviewStreaming(true);
      setPreviewStreamError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('Preview stream connected:', data.message);
        } else if (data.type === 'frame') {
          setPreviewLiveData({
            imageData: data.imageData,
            detections: data.detections || [],
            modelInfo: data.modelInfo || {},
            timestamp: data.timestamp
          });
          setPreviewStreamError(null);
        } else if (data.type === 'error') {
          setPreviewStreamError(data.message);
          setIsPreviewStreaming(false);
          if (eventSource.readyState === EventSource.CLOSED) {
            eventSource.close();
            previewEventSourceRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error parsing preview SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Preview SSE error:', error);
      if (eventSource.readyState === EventSource.CLOSED) {
        setPreviewStreamError('Stream connection closed. Please ensure monitoring is active.');
        setIsPreviewStreaming(false);
        if (previewEventSourceRef.current) {
          previewEventSourceRef.current.close();
          previewEventSourceRef.current = null;
        }
      } else if (eventSource.readyState === EventSource.CONNECTING) {
        setPreviewStreamError('Connecting to stream...');
      } else {
        setPreviewStreamError('Stream connection error. Please ensure monitoring is active.');
        setIsPreviewStreaming(false);
      }
    };

    return () => {
      if (previewEventSourceRef.current) {
        previewEventSourceRef.current.close();
        previewEventSourceRef.current = null;
      }
      setIsPreviewStreaming(false);
    };
  }, [previewingCamera, isMonitoringActiveForPreview]);

  // Draw face detection boxes on canvas overlay
  useEffect(() => {
    if (!previewingCamera || !previewLiveData?.detections) return;
    const image = previewImageRef.current;
    const canvas = previewCanvasRef.current;
    if (!image || !canvas) return;

    const drawDetections = () => {
      if (!image.complete || !image.naturalWidth || !previewLiveData?.detections) return;

      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;
      const displayWidth = image.offsetWidth || image.clientWidth;
      const displayHeight = image.offsetHeight || image.clientHeight;

      const scaleX = displayWidth / naturalWidth;
      const scaleY = displayHeight / naturalHeight;

      // Set canvas size to match displayed image
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw detection boxes
      previewLiveData.detections.forEach((detection) => {
        if (!detection.box) return;

        const box = detection.box;
        const matched = detection.matched;
        const scaledBox = {
          x: box.x * scaleX,
          y: box.y * scaleY,
          width: box.width * scaleX,
          height: box.height * scaleY
        };

        // Draw box
        ctx.strokeStyle = matched ? '#10b981' : '#ef4444'; // Green if matched, red if not
        ctx.lineWidth = 3;
        ctx.strokeRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);

        // Draw label background
        const labelHeight = 30;
        const labelPadding = 8;
        const name = detection.employeeName || 'Unknown';
        const confidence = (detection.confidence * 100).toFixed(0);
        const labelText = `${name} (${confidence}%)`;

        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + labelPadding * 2;
        const labelY = Math.max(scaledBox.y - 5, labelHeight);

        ctx.fillStyle = matched ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
        ctx.fillRect(scaledBox.x, labelY - labelHeight, labelWidth, labelHeight);

        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, scaledBox.x + labelPadding, labelY - 10);
      });
    };

    // Draw when image loads or detections change
    if (image.complete) {
      drawDetections();
    } else {
      image.onload = drawDetections;
    }
  }, [previewLiveData?.detections, previewingCamera]);

  const handleStartPreview = (camera) => {
    setPreviewingCamera(camera);
    setPreviewLiveData(null);
    setPreviewStreamError(null);
  };

  const handleStopPreview = () => {
    if (previewEventSourceRef.current) {
      previewEventSourceRef.current.close();
      previewEventSourceRef.current = null;
    }
    setPreviewingCamera(null);
    setPreviewLiveData(null);
    setPreviewStreamError(null);
    setIsPreviewStreaming(false);
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/cameras', data);
      return response.data;
    },
    onSuccess: async (data) => {
      // Invalidate and refetch cameras list
      await queryClient.invalidateQueries(['cameras']);
      showToast(data.message || 'Camera created successfully', 'success');
      setShowModal(false);
      resetForm();
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create camera', 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/cameras/${id}`, data);
      return response.data;
    },
    onSuccess: async (data) => {
      // Invalidate and refetch cameras list
      await queryClient.invalidateQueries(['cameras']);
      showToast(data.message || 'Camera updated successfully', 'success');
      setShowModal(false);
      resetForm();
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update camera', 'error');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      const response = await api.put(`/cameras/${id}`, { isActive });
      return response.data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries(['cameras']);
      showToast(data.message || `Camera ${data.data?.isActive ? 'activated' : 'deactivated'} successfully`, 'success');
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update camera status', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/cameras/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cameras']);
      showToast('Camera deleted successfully', 'success');
      setDeleteCamera(null);
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete camera', 'error');
    }
  });

  const validateMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/cameras/${id}/validate`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['cameras']);
      if (data.success) {
        showToast('Camera endpoint is valid', 'success');
      } else {
        showToast(data.message || 'Camera endpoint validation failed', 'error');
      }
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to validate camera', 'error');
    }
  });

  const testEndpointMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/cameras/test', data);
      return response.data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        showToast('Camera endpoint test successful', 'success');
      } else {
        showToast(data.message || 'Camera endpoint test failed', 'error');
      }
    },
    onError: (error) => {
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Failed to test camera endpoint'
      });
      showToast(error.response?.data?.message || 'Failed to test camera endpoint', 'error');
    }
  });

  const resetForm = () => {
    stopStream(); // Stop any active stream
    setFormData({
      name: '',
      type: 'ip_camera',
      endpointUrl: '',
      ipAddress: '',
      port: '',
      session: '',
      location: '',
      locationTag: '',
      username: '',
      password: '',
      description: '',
      isActive: true,
      isUnderMaintenance: false
    });
    setEditingCamera(null);
    setTestResult(null);
  };

  const handleEdit = (camera) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name || '',
      type: camera.type || 'ip_camera',
      endpointUrl: camera.endpointUrl || '',
      ipAddress: camera.ipAddress || '',
      port: camera.port || '',
      session: camera.session || '',
      location: camera.location?._id || camera.location || '',
      locationTag: camera.locationTag || '',
      username: camera.username || '',
      password: '', // Don't populate password for security
      description: camera.description || '',
      isActive: camera.isActive !== undefined ? camera.isActive : true,
      isUnderMaintenance: camera.isUnderMaintenance || false
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      showToast('Camera name is required', 'error');
      return;
    }

    // Validate required fields based on camera type
    const needsEndpointUrl = ['http_snapshot', 'stream'].includes(formData.type);
    const needsIpPort = formData.type === 'ip_camera' || formData.type === 'lan_webcam';
    
    if (needsEndpointUrl && !formData.endpointUrl) {
      showToast('Endpoint URL is required for this camera type', 'error');
      return;
    }
    
    if (needsIpPort && (!formData.ipAddress || !formData.port)) {
      showToast('IP Address and Port are required for this camera type', 'error');
      return;
    }

    // Build endpoint URL if using IP/Port/Session
    let endpointUrl = formData.endpointUrl;
    if (needsIpPort && formData.ipAddress && formData.port) {
      const protocol = formData.port === '443' || formData.port === 443 ? 'https' : 'http';
      endpointUrl = `${protocol}://${formData.ipAddress}:${formData.port}`;
      if (formData.session) {
        endpointUrl += `/${formData.session}`;
      }
    }
    
    // Local webcams don't need endpoint URL
    if (LOCAL_WEBCAM_TYPES.includes(formData.type)) {
      endpointUrl = null;
    }

    const submitData = {
      ...formData,
      endpointUrl: endpointUrl || null,
      ipAddress: formData.ipAddress || null,
      port: formData.port ? parseInt(formData.port) : null,
      session: formData.session || null,
      location: formData.location || null,
      username: formData.username || null,
      password: formData.password || null
    };

    if (editingCamera) {
      updateMutation.mutate({ id: editingCamera._id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const stopStream = () => {
    setIsStreaming(false);
    setStreamUrl(null);
    // Stop image stream by clearing the src (for img element, not video)
    if (videoRef.current) {
      videoRef.current.src = '';
      // Clear the src attribute completely to stop loading
      if (videoRef.current.hasAttribute('src')) {
        videoRef.current.removeAttribute('src');
      }
    }
  };

  const handleTestEndpoint = () => {
    // Build endpoint URL
    let currentUrl = formData.endpointUrl;
    if ((formData.type === 'ip_camera' || formData.type === 'lan_webcam') && formData.ipAddress && formData.port) {
      const protocol = formData.port === '443' || formData.port === 443 ? 'https' : 'http';
      currentUrl = `${protocol}://${formData.ipAddress}:${formData.port}`;
      if (formData.session) {
        currentUrl += `/${formData.session}`;
      }
    }
    
    if (!currentUrl) {
      if (LOCAL_WEBCAM_TYPES.includes(formData.type)) {
        showToast('Local webcams do not require network configuration', 'info');
        return;
      } else if (formData.type === 'ip_camera' || formData.type === 'lan_webcam') {
        showToast('Please enter IP Address and Port', 'error');
      } else {
        showToast('Please enter an endpoint URL', 'error');
      }
      return;
    }

    // If already streaming, stop it
    if (isStreaming) {
      stopStream();
      return;
    }

    // Start streaming
    const currentType = formData.type || 'ip_camera';
    
    // For video stream types, show live preview
    if (currentType === 'lan_webcam' || currentType === 'stream') {
      setIsStreaming(true);
      setStreamUrl(currentUrl);
      
      // Also validate the endpoint
      setIsValidating(true);
      testEndpointMutation.mutate({
        endpointUrl: currentUrl,
        username: formData.username || null,
        password: formData.password || null,
        type: currentType
      });
      setTimeout(() => setIsValidating(false), 2000);
    } else {
      // For non-stream types, just validate
      setIsValidating(true);
      testEndpointMutation.mutate({
        endpointUrl: currentUrl,
        username: formData.username || null,
        password: formData.password || null,
        type: currentType
      });
      setTimeout(() => setIsValidating(false), 2000);
    }
  };

  const getStatusBadge = (camera) => {
    if (camera.isUnderMaintenance) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Wrench className="w-3 h-3 mr-1" />
          Maintenance
        </span>
      );
    }
    if (!camera.isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle className="w-3 h-3 mr-1" />
          Inactive
        </span>
      );
    }
    if (camera.lastValidationStatus === 'valid') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </span>
      );
    }
    if (camera.lastValidationStatus === 'invalid') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Invalid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <AlertCircle className="w-3 h-3 mr-1" />
        Pending
      </span>
    );
  };

  const getTypeLabel = (type) => {
    const labels = {
      usb_webcam: 'USB Webcam',
      laptop_webcam: 'Laptop Webcam',
      ip_camera: 'IP Camera',
      lan_webcam: 'LAN Webcam / Software Webcam (DroidCam)',
      http_snapshot: 'HTTP Snapshot',
      stream: 'RTSP / MJPEG Streaming'
    };
    return labels[type] || type;
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center">
          <Camera className="w-4 h-4 mr-2 text-gray-400" />
          <span className="font-medium">{row.name}</span>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'type',
      cell: (row) => (
        <span className="text-sm text-gray-600">{getTypeLabel(row.type)}</span>
      )
    },
    {
      header: 'Endpoint',
      accessor: 'endpointUrl',
      cell: (row) => (
        <span className="text-sm text-gray-600 font-mono truncate max-w-xs">
          {row.endpointUrl}
        </span>
      )
    },
    {
      header: 'Location',
      accessor: 'location',
      cell: (row) => (
        <div>
          {row.location ? (
            <div>
              <span className="text-sm font-medium">{row.location.name}</span>
              {row.locationTag && (
                <span className="text-xs text-gray-500 ml-1">({row.locationTag})</span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400">No location</span>
          )}
        </div>
      )
    },
    {
      header: 'Assignments',
      accessor: 'assignments',
      cell: (row) => {
        const cameraAssignments = assignments?.filter(a => a.camera?._id === row._id) || [];
        const activeAssignments = cameraAssignments.filter(a => a.isActive && a.autoPunchInEnabled).length;
        return (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {activeAssignments} / {cameraAssignments.length}
            </span>
            <button
              onClick={() => navigate('/camera-assignments', { state: { filterCamera: row._id } })}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="View/Manage Assignments"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => getStatusBadge(row)
    },
    {
      header: 'Last Validated',
      accessor: 'lastValidatedAt',
      cell: (row) => (
        <div className="text-sm text-gray-600">
          {row.lastValidatedAt ? (
            <div>
              <div>{new Date(row.lastValidatedAt).toLocaleDateString()}</div>
              <div className="text-xs text-gray-400">
                {new Date(row.lastValidatedAt).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">Never</span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => toggleActiveMutation.mutate({ id: row._id, isActive: !row.isActive })}
            disabled={toggleActiveMutation.isLoading}
            className={`p-1.5 rounded transition-colors ${
              row.isActive 
                ? 'text-yellow-600 hover:bg-yellow-50' 
                : 'text-green-600 hover:bg-green-50'
            }`}
            title={row.isActive ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {row.isActive ? (
              <PowerOff className="w-4 h-4" />
            ) : (
              <Power className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => validateMutation.mutate(row._id)}
            disabled={validateMutation.isLoading}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Validate Camera"
          >
            <TestTube className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartPreview(row)}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Live Face Detection Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Edit Camera"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteCamera(row)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete Camera"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Camera Configuration</h1>
          <p className="text-gray-600 mt-1">Manage IP/HTTP cameras for face attendance</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={() => navigate('/camera-assignments')}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Manage Assignments
          </Button>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Camera
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table
          data={cameras || []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No cameras configured. Add your first camera to get started."
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { 
          stopStream(); // Stop stream when closing modal
          setShowModal(false); 
          resetForm(); 
        }}
        title={editingCamera ? 'Edit Camera' : 'Add Camera'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Camera Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Main Entrance Camera"
            />
            <Select
              label="Camera Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
              options={[
                { value: 'usb_webcam', label: 'USB Webcam' },
                { value: 'laptop_webcam', label: 'Laptop Webcam' },
                { value: 'ip_camera', label: 'IP Camera' },
                { value: 'lan_webcam', label: 'LAN Webcam / Software Webcam (DroidCam)' },
                { value: 'http_snapshot', label: 'HTTP Snapshot' },
                { value: 'stream', label: 'RTSP / MJPEG Streaming' }
              ]}
            />
          </div>

          {/* Conditional fields based on camera type */}
          {LOCAL_WEBCAM_TYPES.includes(formData.type) ? (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Local Webcam: Connect your built-in laptop webcam or USB webcam directly to this computer. No network configuration needed.
              </p>
            </div>
          ) : formData.type === 'ip_camera' || formData.type === 'lan_webcam' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="IP Address"
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  required
                  placeholder="192.168.1.100"
                  type="text"
                />
                <Input
                  label="Port"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  required
                  placeholder={formData.type === 'lan_webcam' ? '4747' : '8080'}
                  type="number"
                />
                <Input
                  label="Path/Session (Optional)"
                  value={formData.session}
                  onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                  placeholder={formData.type === 'lan_webcam' ? 'video (for DroidCam)' : 'snapshot.jpg'}
                  type="text"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 text-sm text-gray-600">
                  {formData.ipAddress && formData.port ? (
                    <span className="font-mono">
                      Endpoint: {formData.port === '443' ? 'https' : 'http'}://{formData.ipAddress}:{formData.port}{formData.session ? '/' + formData.session : ''}
                    </span>
                  ) : (
                    <span>Enter IP Address and Port to see endpoint URL</span>
                  )}
                </div>
                <Button
                  type="button"
                  variant={isStreaming ? "danger" : "outline"}
                  onClick={handleTestEndpoint}
                  disabled={isValidating || testEndpointMutation.isLoading || !formData.ipAddress || !formData.port}
                  className="mb-0"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {isStreaming ? 'Stop Stream' : (isValidating || testEndpointMutation.isLoading ? 'Testing...' : 'Test')}
                </Button>
              </div>
              
              {/* Video Stream Preview */}
              {isStreaming && streamUrl && formData.type === 'lan_webcam' && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Live Stream Preview</label>
                    <button
                      onClick={stopStream}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Close
                    </button>
                  </div>
                  <div className="relative bg-black rounded overflow-hidden" style={{ maxHeight: '480px' }}>
                    <img
                      ref={videoRef}
                      src={streamUrl}
                      alt="Camera stream"
                      className="w-full h-auto"
                      style={{ maxHeight: '480px', objectFit: 'contain' }}
                      onError={(e) => {
                        console.error('Stream error:', e);
                        showToast('Failed to load stream. Please check the IP, Port, and Path.', 'error');
                        stopStream();
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Streaming from {streamUrl}
                  </p>
                </div>
              )}
              {testResult && (
                <div className={`mt-2 p-3 rounded-md ${
                  testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  <div className="flex items-center">
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    <span className="text-sm font-medium">
                      {testResult.success ? 'Camera endpoint is accessible' : testResult.message}
                    </span>
                  </div>
                  {testResult.data?.imageInfo && (
                    <div className="mt-2 text-xs text-gray-600">
                      Image: {testResult.data.imageInfo.width}x{testResult.data.imageInfo.height}px
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Endpoint URL"
                    value={formData.endpointUrl}
                    onChange={(e) => setFormData({ ...formData, endpointUrl: e.target.value })}
                    required={['ip_camera', 'http_snapshot', 'lan_webcam', 'stream'].includes(formData.type)}
                    placeholder={
                      formData.type === 'lan_webcam' ? 'http://192.168.x.x:4747/video (for DroidCam)' :
                      formData.type === 'stream' ? 'http://192.168.x.x/mjpeg or rtsp://192.168.x.x:554/stream' :
                      'http://192.168.1.50/snapshot.jpg'
                    }
                    type="url"
                  />
                </div>
                <Button
                  type="button"
                  variant={isStreaming ? "danger" : "outline"}
                  onClick={handleTestEndpoint}
                  disabled={isValidating || testEndpointMutation.isLoading}
                  className="mb-0"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {isStreaming ? 'Stop Stream' : (isValidating || testEndpointMutation.isLoading ? 'Testing...' : 'Test')}
                </Button>
              </div>
              
              {/* Video Stream Preview */}
              {isStreaming && streamUrl && (formData.type === 'lan_webcam' || formData.type === 'stream') && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Live Stream Preview</label>
                    <button
                      onClick={stopStream}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Close
                    </button>
                  </div>
                  <div className="relative bg-black rounded overflow-hidden" style={{ maxHeight: '480px' }}>
                    <img
                      ref={videoRef}
                      src={streamUrl}
                      alt="Camera stream"
                      className="w-full h-auto"
                      style={{ maxHeight: '480px', objectFit: 'contain' }}
                      onError={(e) => {
                        console.error('Stream error:', e);
                        showToast('Failed to load stream. Please check the URL and camera type.', 'error');
                        stopStream();
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Streaming from {streamUrl}
                  </p>
                </div>
              )}
              {testResult && (
                <div className={`mt-2 p-3 rounded-md ${
                  testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  <div className="flex items-center">
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    <span className="text-sm font-medium">
                      {testResult.success ? 'Endpoint is valid' : testResult.message}
                    </span>
                  </div>
                  {testResult.data?.imageInfo && (
                    <div className="mt-2 text-xs text-gray-600">
                      Image: {testResult.data.imageInfo.width}x{testResult.data.imageInfo.height}px
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Location (Optional)"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              options={[
                { value: '', label: 'No Location' },
                ...(branches || []).map(branch => ({
                  value: branch._id,
                  label: branch.name
                }))
              ]}
            />
            <Input
              label="Location Tag (Optional)"
              value={formData.locationTag}
              onChange={(e) => setFormData({ ...formData, locationTag: e.target.value })}
              placeholder="e.g., Reception, Parking"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Username (Optional)"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Camera username"
            />
            <Input
              label="Password (Optional)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              type="password"
              placeholder="Camera password"
            />
          </div>

          <Input
            label="Description (Optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Additional notes about this camera"
            multiline
            rows={3}
          />

          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isUnderMaintenance}
                onChange={(e) => setFormData({ ...formData, isUnderMaintenance: e.target.checked })}
                className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
              <span className="ml-2 text-sm text-gray-700">Under Maintenance</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowModal(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isLoading || updateMutation.isLoading}
            >
              {editingCamera ? 'Update Camera' : 'Create Camera'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteCamera}
        onClose={() => setDeleteCamera(null)}
        onConfirm={() => deleteMutation.mutate(deleteCamera._id)}
        title="Delete Camera"
        message={`Are you sure you want to delete "${deleteCamera?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Face Detection Preview Modal */}
      <Modal
        isOpen={!!previewingCamera}
        onClose={handleStopPreview}
        title={`Live Face Detection - ${previewingCamera?.name || ''}`}
        size="xl"
      >
        <div className="space-y-4">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              {isPreviewStreaming && !previewStreamError && (
                <span className="flex items-center text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Live Streaming
                </span>
              )}
              {previewStreamError && (
                <span className="flex items-center text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {previewStreamError}
                </span>
              )}
              {!isPreviewStreaming && !previewStreamError && (
                <span className="flex items-center text-sm text-gray-600">
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </span>
              )}
            </div>
            {previewStreamError?.includes('monitoring is not active') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/attendance?tab=realtime')}
              >
                Go to Real-Time Attendance
              </Button>
            )}
          </div>

          {/* Preview Display */}
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
            {previewStreamError && !previewStreamError.includes('Connecting') ? (
              <div className="flex items-center justify-center h-96 text-white">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                  <p className="text-lg mb-2">Preview Unavailable</p>
                  <p className="text-sm text-gray-400 max-w-md">
                    {previewStreamError}
                  </p>
                </div>
              </div>
            ) : previewLiveData?.imageData ? (
              <div className="relative w-full flex items-center justify-center">
                <img
                  ref={previewImageRef}
                  src={previewLiveData.imageData}
                  alt="Live Camera Feed"
                  className="max-w-full max-h-[600px] object-contain"
                />
                {/* Canvas overlay for bounding boxes */}
                {previewLiveData.detections && previewLiveData.detections.length > 0 && (
                  <canvas
                    ref={previewCanvasRef}
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ maxWidth: '100%', maxHeight: '600px' }}
                  />
                )}
                {/* Detection Overlays */}
                {previewLiveData.detections && previewLiveData.detections.length > 0 && (
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 min-w-[200px]">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${
                        previewLiveData.detections.some(d => d.matched) 
                          ? 'bg-green-500 animate-pulse' 
                          : 'bg-yellow-500 animate-pulse'
                      }`}></div>
                      <span className="text-white text-sm font-semibold">
                        {previewLiveData.detections.length} {previewLiveData.detections.length === 1 ? 'Face' : 'Faces'} Detected
                      </span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {previewLiveData.detections.map((detection, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded border ${
                            detection.matched 
                              ? 'bg-green-500/20 border-green-500' 
                              : 'bg-red-500/20 border-red-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              {detection.matched ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                              <span className="text-white text-xs font-medium">
                                {detection.employeeName || 'Unknown'}
                              </span>
                            </div>
                            <span className={`text-xs font-medium ${
                              detection.matched ? 'text-green-300' : 'text-red-300'
                            }`}>
                              {(detection.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          {detection.employeeId && (
                            <p className="text-xs text-gray-300 mt-1">ID: {detection.employeeId}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 text-white">
                <div className="text-center">
                  <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Loading live feed...</p>
                </div>
              </div>
            )}
          </div>

          {/* Detection Stats */}
          {previewLiveData?.detections && previewLiveData.detections.length > 0 && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">
                  {previewLiveData.detections.filter(d => d.matched).length}
                </div>
                <div className="text-sm text-green-700">Matched Employees</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600">
                  {previewLiveData.detections.filter(d => !d.matched).length}
                </div>
                <div className="text-sm text-red-700">Unknown Faces</div>
              </div>
            </div>
          )}

          {/* Model Info */}
          {previewLiveData?.modelInfo && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Model Information</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    previewLiveData.modelInfo.loaded ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {previewLiveData.modelInfo.loaded ? 'Loaded' : 'Not Loaded'}
                  </span>
                </div>
                {previewLiveData.modelInfo.detector && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Detector:</span>
                    <span className="font-medium">{previewLiveData.modelInfo.detector}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={handleStopPreview}>
              Close Preview
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Cameras;

