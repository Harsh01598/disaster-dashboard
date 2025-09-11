document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map centered on India with mobile-friendly options
    const map = L.map('map', {
        tap: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        zoomControl: false  // We'll add zoom control in a mobile-friendly position
    }).setView([20.5937, 78.9629], 5);

    // Add zoom control in a better position for mobile
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);
    
    // Initialize global variables for AI decision model
    let aiModelInitialized = false;
    let resourceAllocationRecommendations = {};
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Add India boundary GeoJSON
    fetch('https://raw.githubusercontent.com/geohacker/india/master/states/india_state.geojson')
        .then(response => response.json())
        .then(data => {
            // Add GeoJSON layer with state boundaries
            L.geoJSON(data, {
                style: {
                    color: '#0078d4',
                    weight: 1,
                    fillColor: '#e6f2ff',
                    fillOpacity: 0.2
                },
                onEachFeature: function(feature, layer) {
                    if (feature.properties && feature.properties.NAME_1) {
                        layer.bindPopup(`<b>${feature.properties.NAME_1}</b>`);
                    }
                }
            }).addTo(map);
        })
        .catch(error => {
            console.error('Error loading India GeoJSON:', error);
            // Fallback: Add a simple marker for India if GeoJSON fails
            L.marker([20.5937, 78.9629]).addTo(map)
                .bindPopup('India')
                .openPopup();
        });
    
    // Disaster data storage
    let disasters = [];
    
    // API endpoint for disaster data
    const API_ENDPOINT = 'https://api.example.com/disasters';
    
    // Initialize AI model and fetch disaster data on page load
    setTimeout(() => {
        initializeDecisionAIModel();
        fetchDisasterData(); // Fetch disaster data when page loads
    }, 2000); // Delay initialization to ensure UI is loaded
    
    // Add event listeners for AI allocation buttons
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('ai-allocate-btn')) {
            const disasterId = event.target.getAttribute('data-id');
            if (disasterId) {
                handleAIResourceAllocation(disasterId);
            } else {
                console.error('No disaster ID found on AI allocate button');
                showNotification('Error: Could not identify disaster for resource allocation', 'error');
            }
        }
    });
    
    // Handle AI resource allocation
    function handleAIResourceAllocation(disasterId) {
        // Check if AI model is initialized
        if (!aiModelInitialized) {
            showNotification('AI model is initializing. Please wait...', 'warning');
            initializeDecisionAIModel();
            setTimeout(() => {
                processResourceAllocation(disasterId);
            }, 2000);
            return;
        }
        
        processResourceAllocation(disasterId);
    }
    
    // Process resource allocation
    function processResourceAllocation(disasterId) {
        // Generate recommendations
        resourceAllocationRecommendations = generateResourceRecommendations();
        
        // Check if we have recommendations for this disaster
        if (!resourceAllocationRecommendations[disasterId]) {
            showNotification(`No resource allocation recommendations available for disaster ${disasterId}`, 'warning');
            return;
        }
        
        // Implement the recommendations
        if (implementResourceAllocation(disasterId)) {
            showNotification(`Resources successfully allocated for disaster ${disasterId}`, 'success');
        } else {
            showNotification(`Failed to allocate resources for disaster ${disasterId}`, 'error');
        }
    }
    
    // Update alerts feed with disaster data
    function updateAlertsFeed() {
        const alertsContainer = document.querySelector('.alerts-content');
        if (!alertsContainer) {
            console.error('Alerts container not found');
            return;
        }
        
        // Clear existing alerts
        alertsContainer.innerHTML = '';
        
        // Sort disasters by reported date (newest first)
        const sortedDisasters = [...disasters].sort((a, b) => {
            const dateA = new Date(a.reported);
            const dateB = new Date(b.reported);
            return dateB - dateA;
        });
        
        // Add each disaster to the alerts feed
        sortedDisasters.forEach(disaster => {
            // Format date for display
            let formattedDate = 'Unknown';
            if (disaster.reported) {
                const reportDate = new Date(disaster.reported);
                if (!isNaN(reportDate.getTime())) {
                    formattedDate = reportDate.toLocaleString();
                }
            }
            
            // Create alert item
            const alertItem = document.createElement('div');
            alertItem.className = `alert-item ${disaster.severity}`;
            alertItem.setAttribute('data-id', disaster.id);
            
            alertItem.innerHTML = `
                <div class="alert-icon ${disaster.type}"></div>
                <div class="alert-info">
                    <h3>${disaster.title}</h3>
                    <p class="alert-location">${disaster.location}</p>
                    <p class="alert-time">${formattedDate}</p>
                    <p class="alert-description">${disaster.description}</p>
                    <p class="alert-status">Status: ${disaster.status.charAt(0).toUpperCase() + disaster.status.slice(1)}</p>
                </div>
                <div class="alert-actions">
                    <button class="ai-allocate-btn" data-id="${disaster.id}">AI Allocate Resources</button>
                </div>
            `;
            
            // Add to container
            alertsContainer.appendChild(alertItem);
            
            // Add click event to show on map
            alertItem.addEventListener('click', function(e) {
                // Don't trigger if clicking on a button
                if (e.target.tagName === 'BUTTON') return;
                
                // Find marker and open popup
                const marker = markers[disaster.id];
                if (marker) {
                    // Switch to map tab
                    activateTab('map');
                    
                    // Pan and zoom to marker with animation
                    map.flyTo([disaster.lat, disaster.lng], 15, {
                        duration: 1.5,
                        easeLinearity: 0.25
                    });
                    marker.openPopup();

                    // Clear existing nearby markers
                    if (window.nearbyMarkers) {
                        window.nearbyMarkers.forEach(m => map.removeLayer(m));
                    }
                    window.nearbyMarkers = [];

                    // Add random nearby shelters (3-5)
                    const numShelters = Math.floor(Math.random() * 3) + 3;
                    for (let i = 0; i < numShelters; i++) {
                        // Generate random coordinates within ~2km radius
                        const lat = disaster.lat + (Math.random() - 0.5) * 0.02;
                        const lng = disaster.lng + (Math.random() - 0.5) * 0.02;
                        
                        const shelterMarker = L.marker([lat, lng], {
                            icon: L.divIcon({
                                className: 'shelter-marker',
                                html: '<i class="fas fa-house-user"></i>',
                                iconSize: [30, 30]
                            })
                        });
                        
                        shelterMarker.bindPopup(`
                            <h3>Emergency Shelter</h3>
                            <p>Capacity: ${Math.floor(Math.random() * 100) + 100} people</p>
                            <p>Currently Available: ${Math.floor(Math.random() * 50) + 50} spots</p>
                            <p>Contact: +91 ${Math.floor(Math.random() * 9000000000) + 1000000000}</p>
                        `);
                        
                        shelterMarker.addTo(map);
                        window.nearbyMarkers.push(shelterMarker);
                    }

                    // Add random nearby hospitals (2-4)
                    const numHospitals = Math.floor(Math.random() * 3) + 2;
                    for (let i = 0; i < numHospitals; i++) {
                        // Generate random coordinates within ~2km radius
                        const lat = disaster.lat + (Math.random() - 0.5) * 0.02;
                        const lng = disaster.lng + (Math.random() - 0.5) * 0.02;
                        
                        const hospitalMarker = L.marker([lat, lng], {
                            icon: L.divIcon({
                                className: 'hospital-marker',
                                html: '<i class="fas fa-hospital"></i>',
                                iconSize: [30, 30]
                            })
                        });
                        
                        hospitalMarker.bindPopup(`
                            <h3>Hospital</h3>
                            <p>Type: ${['Government', 'Private'][Math.floor(Math.random() * 2)]} Hospital</p>
                            <p>Emergency Beds Available: ${Math.floor(Math.random() * 20) + 5}</p>
                            <p>Contact: +91 ${Math.floor(Math.random() * 9000000000) + 1000000000}</p>
                        `);
                        
                        hospitalMarker.addTo(map);
                        window.nearbyMarkers.push(hospitalMarker);
                    }
                }
            });
        });
    }
    
    // Fetch disaster data from API
    async function fetchDisasterData() {
        try {
            // Show loading indicator
            showLoadingIndicator();
            
            // In a real implementation, this would be an actual API call
            // For now, we'll use a timeout to simulate network request
            // and return our sample data
            
            // Simulated API call
            const response = await new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            data: [
                                { 
                                    id: 'D001',
                                    lat: 19.0760, 
                                    lng: 72.8777, 
                                    type: 'flood', 
                                    severity: 'high', 
                                    title: 'Mumbai Floods', 
                                    description: 'Severe flooding in Mumbai metropolitan area',
                                    location: 'Mumbai, Maharashtra',
                                    reported: '2023-06-15T10:30:00',
                                    affected: 15000,
                                    status: 'active'
                                },
                                { 
                                    id: 'D002',
                                    lat: 28.7041, 
                                    lng: 77.1025, 
                                    type: 'fire', 
                                    severity: 'medium', 
                                    title: 'Delhi Industrial Fire', 
                                    description: 'Fire outbreak in industrial zone',
                                    location: 'Delhi',
                                    reported: '2023-06-14T15:45:00',
                                    affected: 500,
                                    status: 'active'
                                },
                                { 
                                    id: 'D003',
                                    lat: 13.0827, 
                                    lng: 80.2707, 
                                    type: 'cyclone', 
                                    severity: 'high', 
                                    title: 'Chennai Cyclone', 
                                    description: 'Cyclone approaching Chennai coastline',
                                    location: 'Chennai, Tamil Nadu',
                                    reported: '2023-06-13T08:15:00',
                                    affected: 25000,
                                    status: 'active'
                                },
                                { 
                                    id: 'D004',
                                    lat: 17.3850, 
                                    lng: 78.4867, 
                                    type: 'earthquake', 
                                    severity: 'low', 
                                    title: 'Hyderabad Tremors', 
                                    description: 'Minor seismic activity detected',
                                    location: 'Hyderabad, Telangana',
                                    reported: '2023-06-12T23:10:00',
                                    affected: 5000,
                                    status: 'monitoring'
                                },
                                { 
                                    id: 'D005',
                                    lat: 23.0225, 
                                    lng: 72.5714, 
                                    type: 'drought', 
                                    severity: 'medium', 
                                    title: 'Gujarat Drought', 
                                    description: 'Water scarcity affecting agricultural regions',
                                    location: 'Gujarat',
                                    reported: '2023-06-01T09:00:00',
                                    affected: 50000,
                                    status: 'active'
                                },
                                { 
                                    id: 'D006',
                                    lat: 22.5726, 
                                    lng: 88.3639, 
                                    type: 'flood', 
                                    severity: 'medium', 
                                    title: 'Kolkata Urban Flooding', 
                                    description: 'Urban flooding due to heavy monsoon rainfall',
                                    location: 'Kolkata, West Bengal',
                                    reported: '2023-06-10T14:20:00',
                                    affected: 8000,
                                    status: 'active'
                                },
                                { 
                                    id: 'D007',
                                    lat: 12.9716, 
                                    lng: 77.5946, 
                                    type: 'fire', 
                                    severity: 'low', 
                                    title: 'Bangalore Tech Park Fire', 
                                    description: 'Small fire at technology park, quickly contained',
                                    location: 'Bangalore, Karnataka',
                                    reported: '2023-06-16T11:05:00',
                                    affected: 200,
                                    status: 'resolved'
                                },
                                { 
                                    id: 'D008',
                                    lat: 26.8467, 
                                    lng: 80.9462, 
                                    type: 'heatwave', 
                                    severity: 'high', 
                                    title: 'Lucknow Heatwave', 
                                    description: 'Extreme temperatures causing health emergencies',
                                    location: 'Lucknow, Uttar Pradesh',
                                    reported: '2023-06-05T08:30:00',
                                    affected: 30000,
                                    status: 'active'
                                }
                            ]
                        })
                    });
                }, 1000);
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch disaster data');
            }
            
            const result = await response.json();
            disasters = result.data;
            
            // Process and validate the data
            validateAndCleanData();
            
            // Render the markers on the map
            renderMarkers(disasters);
            
            // Update the alerts feed
            updateAlertsFeed();
            
            // Hide loading indicator
            hideLoadingIndicator();
            
            return disasters;
        } catch (error) {
            console.error('Error fetching disaster data:', error);
            hideLoadingIndicator();
            showErrorNotification('Failed to load disaster data. Please try again later.');
            
            // Fallback to empty array if fetch fails
            return [];
        }
    }
    
    // Validate and clean the fetched data
    function validateAndCleanData() {
        // Filter out invalid entries
        disasters = disasters.filter(disaster => {
            // Check for required fields
            if (!disaster.id || !disaster.lat || !disaster.lng || !disaster.type || !disaster.severity) {
                console.warn('Invalid disaster data:', disaster);
                return false;
            }
            
            // Validate coordinates
            if (isNaN(parseFloat(disaster.lat)) || isNaN(parseFloat(disaster.lng))) {
                console.warn('Invalid coordinates:', disaster);
                return false;
            }
            
            // Validate disaster type
            const validTypes = ['flood', 'fire', 'earthquake', 'cyclone', 'drought', 'heatwave'];
            if (!validTypes.includes(disaster.type)) {
                console.warn('Invalid disaster type:', disaster.type);
                disaster.type = 'other'; // Set default type
            }
            
            // Ensure affected property exists
            if (disaster.affected === undefined || disaster.affected === null) {
                disaster.affected = 'Unknown';
            }
            
            // Validate severity
            const validSeverities = ['high', 'medium', 'low'];
            if (!validSeverities.includes(disaster.severity)) {
                console.warn('Invalid severity level:', disaster.severity);
                disaster.severity = 'medium'; // Set default severity
            }
            
            // Ensure reported date is valid
            if (disaster.reported) {
                const reportDate = new Date(disaster.reported);
                if (isNaN(reportDate.getTime())) {
                    console.warn('Invalid date format:', disaster.reported);
                    disaster.reported = new Date().toISOString(); // Set to current date
                }
            } else {
                disaster.reported = new Date().toISOString(); // Set default date
            }
            
            return true;
        });
    }
    
    // Show loading indicator
    function showLoadingIndicator() {
        // Create loading indicator if it doesn't exist
        if (!document.getElementById('loading-indicator')) {
            const loader = document.createElement('div');
            loader.id = 'loading-indicator';
            loader.innerHTML = '<div class="spinner"></div><p>Loading disaster data...</p>';
            document.body.appendChild(loader);
        } else {
            document.getElementById('loading-indicator').style.display = 'flex';
        }
    }
    
    // Hide loading indicator
    function hideLoadingIndicator() {
        const loader = document.getElementById('loading-indicator');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    // Show error notification
    function showErrorNotification(message) {
        // Create notification if it doesn't exist
        if (!document.getElementById('error-notification')) {
            const notification = document.createElement('div');
            notification.id = 'error-notification';
            notification.innerHTML = `<p>${message}</p><button class="close-btn">×</button>`;
            document.body.appendChild(notification);
            
            // Add event listener to close button
            notification.querySelector('.close-btn').addEventListener('click', () => {
                notification.style.display = 'none';
            });
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                notification.style.display = 'none';
            }, 5000);
        } else {
            const notification = document.getElementById('error-notification');
            notification.querySelector('p').textContent = message;
            notification.style.display = 'block';
        }
    }
    
    // Decision AI Model for Resource Allocation
    function initializeDecisionAIModel() {
        if (aiModelInitialized) {
            return;
        }
        
        console.log('Initializing Decision AI Model...');
        
        // In a real implementation, this would load a trained model
        // For this prototype, we'll use rule-based decision making
        
        // Simulate model initialization
        setTimeout(() => {
            aiModelInitialized = true;
            console.log('Decision AI Model initialized successfully');
            showNotification('AI Decision Model initialized successfully', 'success');
        }, 1500);
    }
    
    // Generate resource allocation recommendations based on disaster data
    function generateResourceRecommendations() {
        if (!aiModelInitialized) {
            console.warn('Decision AI Model not initialized');
            initializeDecisionAIModel();
            return {};
        }
        
        // Clear previous recommendations
        resourceAllocationRecommendations = {};
        
        // Get active disasters
        const activeDisasters = disasters.filter(d => d.status === 'active');
        
        // Get available resources
        const availableAmbulances = getAvailableResources('ambulances');
        const availableRescueTeams = getAvailableResources('rescue-teams');
        const availableShelters = getAvailableResources('shelters');
        
        // Sort disasters by priority (severity and affected population)
        const prioritizedDisasters = activeDisasters.sort((a, b) => {
            // Convert severity to numeric value
            const severityValues = { 'high': 3, 'medium': 2, 'low': 1 };
            const severityA = severityValues[a.severity] || 1;
            const severityB = severityValues[b.severity] || 1;
            
            // Calculate priority score based on severity and affected population
            const scoreA = (severityA * 10) + (a.affected ? Math.log10(a.affected) : 0);
            const scoreB = (severityB * 10) + (b.affected ? Math.log10(b.affected) : 0);
            
            return scoreB - scoreA; // Higher score = higher priority
        });
        
        // Allocate resources based on disaster type and severity
        prioritizedDisasters.forEach(disaster => {
            const recommendations = {
                ambulances: [],
                rescueTeams: [],
                shelters: []
            };
            
            // Determine resource needs based on disaster type and severity
            const severityFactor = { 'high': 1, 'medium': 0.6, 'low': 0.3 }[disaster.severity] || 0.5;
            const affectedPopulation = disaster.affected || 1000; // Default if missing
            
            // Calculate needed resources
            let neededAmbulances = 0;
            let neededRescueTeams = 0;
            let neededShelterCapacity = 0;
            
            switch (disaster.type) {
                case 'flood':
                    neededAmbulances = Math.ceil(affectedPopulation / 5000 * severityFactor);
                    neededRescueTeams = Math.ceil(affectedPopulation / 2000 * severityFactor);
                    neededShelterCapacity = Math.ceil(affectedPopulation * 0.7 * severityFactor);
                    break;
                case 'fire':
                    neededAmbulances = Math.ceil(affectedPopulation / 2000 * severityFactor);
                    neededRescueTeams = Math.ceil(affectedPopulation / 3000 * severityFactor);
                    neededShelterCapacity = Math.ceil(affectedPopulation * 0.5 * severityFactor);
                    break;
                case 'earthquake':
                    neededAmbulances = Math.ceil(affectedPopulation / 1000 * severityFactor);
                    neededRescueTeams = Math.ceil(affectedPopulation / 1500 * severityFactor);
                    neededShelterCapacity = Math.ceil(affectedPopulation * 0.9 * severityFactor);
                    break;
                case 'cyclone':
                    neededAmbulances = Math.ceil(affectedPopulation / 3000 * severityFactor);
                    neededRescueTeams = Math.ceil(affectedPopulation / 2000 * severityFactor);
                    neededShelterCapacity = Math.ceil(affectedPopulation * 0.8 * severityFactor);
                    break;
                case 'drought':
                    neededAmbulances = Math.ceil(affectedPopulation / 10000 * severityFactor);
                    neededRescueTeams = Math.ceil(affectedPopulation / 20000 * severityFactor);
                    neededShelterCapacity = Math.ceil(affectedPopulation * 0.2 * severityFactor);
                    break;
                case 'heatwave':
                    neededAmbulances = Math.ceil(affectedPopulation / 8000 * severityFactor);
                    neededRescueTeams = Math.ceil(affectedPopulation / 15000 * severityFactor);
                    neededShelterCapacity = Math.ceil(affectedPopulation * 0.3 * severityFactor);
                    break;
                default:
                    neededAmbulances = Math.ceil(affectedPopulation / 5000 * severityFactor);
                    neededRescueTeams = Math.ceil(affectedPopulation / 5000 * severityFactor);
                    neededShelterCapacity = Math.ceil(affectedPopulation * 0.5 * severityFactor);
            }
            
            // Limit based on available resources
            neededAmbulances = Math.min(neededAmbulances, availableAmbulances.length);
            neededRescueTeams = Math.min(neededRescueTeams, availableRescueTeams.length);
            
            // Allocate ambulances
            for (let i = 0; i < neededAmbulances; i++) {
                if (availableAmbulances.length > 0) {
                    const ambulance = availableAmbulances.shift();
                    recommendations.ambulances.push(ambulance);
                }
            }
            
            // Allocate rescue teams
            for (let i = 0; i < neededRescueTeams; i++) {
                if (availableRescueTeams.length > 0) {
                    const team = availableRescueTeams.shift();
                    recommendations.rescueTeams.push(team);
                }
            }
            
            // Allocate shelters based on capacity needs
            let remainingCapacityNeeded = neededShelterCapacity;
            availableShelters.forEach(shelter => {
                if (remainingCapacityNeeded > 0 && shelter.availableCapacity > 0) {
                    const allocated = Math.min(remainingCapacityNeeded, shelter.availableCapacity);
                    remainingCapacityNeeded -= allocated;
                    recommendations.shelters.push({
                        id: shelter.id,
                        allocatedCapacity: allocated
                    });
                }
            });
            
            // Store recommendations for this disaster
            resourceAllocationRecommendations[disaster.id] = recommendations;
        });
        
        return resourceAllocationRecommendations;
    }
    
    // Get available resources of a specific type
    function getAvailableResources(resourceType) {
        // In a real implementation, this would fetch from a database or API
        // For this prototype, we'll use sample data
        
        switch (resourceType) {
            case 'ambulances':
                return [
                    { id: 'AMB-001', type: 'Advanced Life Support', location: 'Delhi General Hospital' },
                    { id: 'AMB-003', type: 'Advanced Life Support', location: 'Chennai Medical Center' },
                    { id: 'AMB-004', type: 'Basic Life Support', location: 'Mumbai City Hospital' },
                    { id: 'AMB-005', type: 'Advanced Life Support', location: 'Kolkata Medical College' }
                ];
            case 'rescue-teams':
                return [
                    { id: 'RT-001', specialty: 'Water Rescue', personnel: 12, location: 'Delhi NDRF Base' },
                    { id: 'RT-003', specialty: 'Urban Search & Rescue', personnel: 8, location: 'Mumbai Fire Station' },
                    { id: 'RT-004', specialty: 'Mountain Rescue', personnel: 6, location: 'Shimla Rescue Center' }
                ];
            case 'shelters':
                return [
                    { id: 'SH-001', location: 'Chennai Government School', totalCapacity: 200, occupancy: 45, availableCapacity: 155 },
                    { id: 'SH-003', location: 'Delhi Community Center', totalCapacity: 300, occupancy: 120, availableCapacity: 180 },
                    { id: 'SH-004', location: 'Bangalore College Gymnasium', totalCapacity: 250, occupancy: 50, availableCapacity: 200 }
                ];
            default:
                return [];
        }
    }
    
    // Implement resource allocation based on AI recommendations
    function implementResourceAllocation(disasterId) {
        if (!resourceAllocationRecommendations[disasterId]) {
            console.warn(`No recommendations available for disaster ${disasterId}`);
            return false;
        }
        
        const recommendations = resourceAllocationRecommendations[disasterId];
        console.log(`Implementing resource allocation for disaster ${disasterId}:`, recommendations);
        
        // In a real implementation, this would update a database or send commands to resources
        // For this prototype, we'll just simulate the allocation
        
        // Update UI to reflect allocations
        updateResourceAllocationUI(disasterId, recommendations);
        
        // Return success
        return true;
    }
    
    // Update UI to reflect resource allocations
    function updateResourceAllocationUI(disasterId, recommendations) {
        // Find the disaster details
        const disaster = disasters.find(d => d.id === disasterId);
        if (!disaster) return;
        
        // Update ambulances UI
        recommendations.ambulances.forEach(ambulance => {
            const ambulanceCard = document.querySelector(`.resource-card[data-id="${ambulance.id}"]`);
            if (ambulanceCard) {
                ambulanceCard.classList.remove('available');
                ambulanceCard.classList.add('busy');
                
                const statusElement = ambulanceCard.querySelector('.resource-status');
                if (statusElement) statusElement.textContent = 'On Mission';
                
                const detailsElement = ambulanceCard.querySelector('.resource-details');
                if (detailsElement) {
                    const assignedElement = document.createElement('p');
                    assignedElement.innerHTML = `<strong>Assigned to:</strong> ${disaster.title}`;
                    detailsElement.appendChild(assignedElement);
                }
                
                const actionButton = ambulanceCard.querySelector('.assign-btn');
                if (actionButton) {
                    actionButton.textContent = 'Track Location';
                    actionButton.className = 'track-btn';
                }
            }
        });
        
        // Update rescue teams UI
        recommendations.rescueTeams.forEach(team => {
            const teamCard = document.querySelector(`.resource-card[data-id="${team.id}"]`);
            if (teamCard) {
                teamCard.classList.remove('available');
                teamCard.classList.add('busy');
                
                const statusElement = teamCard.querySelector('.resource-status');
                if (statusElement) statusElement.textContent = 'Deployed';
                
                const detailsElement = teamCard.querySelector('.resource-details');
                if (detailsElement) {
                    const assignedElement = document.createElement('p');
                    assignedElement.innerHTML = `<strong>Assigned to:</strong> ${disaster.title}`;
                    detailsElement.appendChild(assignedElement);
                }
                
                const actionButton = teamCard.querySelector('.assign-btn');
                if (actionButton) {
                    actionButton.textContent = 'Track Location';
                    actionButton.className = 'track-btn';
                }
            }
        });
        
        // Update shelters UI
        recommendations.shelters.forEach(shelter => {
            const shelterCard = document.querySelector(`.resource-card[data-id="${shelter.id}"]`);
            if (shelterCard) {
                const capacityText = shelterCard.querySelector('p:nth-child(3)');
                const capacityBar = shelterCard.querySelector('.capacity-fill');
                
                if (capacityText && capacityBar) {
                    // Get current occupancy
                    const currentText = capacityText.textContent;
                    const match = currentText.match(/(\d+)\s+people/);
                    let currentOccupancy = match ? parseInt(match[1]) : 0;
                    
                    // Update with allocated capacity
                    const newOccupancy = currentOccupancy + shelter.allocatedCapacity;
                    capacityText.innerHTML = `<strong>Currently Occupied:</strong> ${newOccupancy} people`;
                    
                    // Get total capacity
                    const totalCapacityMatch = shelterCard.querySelector('p:nth-child(2)').textContent.match(/(\d+)\s+people/);
                    const totalCapacity = totalCapacityMatch ? parseInt(totalCapacityMatch[1]) : 100;
                    
                    // Update capacity bar
                    const percentage = Math.min(100, Math.round((newOccupancy / totalCapacity) * 100));
                    capacityBar.style.width = `${percentage}%`;
                    
                    // Update status based on new occupancy
                    const statusElement = shelterCard.querySelector('.resource-status');
                    if (statusElement) {
                        if (percentage > 90) {
                            statusElement.textContent = 'Full';
                        } else if (percentage > 70) {
                            statusElement.textContent = 'Almost Full';
                        } else {
                            statusElement.textContent = 'Space Available';
                        }
                    }
                }
            }
        });
    }
    
    // Show general notification
    function showNotification(message, type = 'info') {
        // Create notification container if it doesn't exist
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <p>${message}</p>
            <button class="close-btn">×</button>
        `;
        
        // Add to container
        container.appendChild(notification);
        
        // Add event listener to close button
        notification.querySelector('.close-btn').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }
    
    // Custom icons for different disaster types
    const disasterIcons = {
        flood: L.divIcon({
            className: 'disaster-icon flood',
            html: '<div class="icon-inner"></div>',
            iconSize: [20, 20]
        }),
        fire: L.divIcon({
            className: 'disaster-icon fire',
            html: '<div class="icon-inner"></div>',
            iconSize: [20, 20]
        }),
        cyclone: L.divIcon({
            className: 'disaster-icon cyclone',
            html: '<div class="icon-inner"></div>',
            iconSize: [20, 20]
        }),
        earthquake: L.divIcon({
            className: 'disaster-icon earthquake',
            html: '<div class="icon-inner"></div>',
            iconSize: [20, 20]
        }),
        drought: L.divIcon({
            className: 'disaster-icon drought',
            html: '<div class="icon-inner"></div>',
            iconSize: [20, 20]
        }),
        heatwave: L.divIcon({
            className: 'disaster-icon heatwave',
            html: '<div class="icon-inner"></div>',
            iconSize: [20, 20]
        })
    };
    
    // Store markers for filtering
    const markers = {};
    
    // Add disaster markers to the map
    function renderMarkers(disasterList = disasters) {
        // Clear existing markers
        Object.values(markers).forEach(marker => map.removeLayer(marker));
        Object.keys(markers).forEach(key => delete markers[key]);
        
        // Add filtered markers
        disasterList.forEach(disaster => {
            // Skip if missing required data
            if (!disaster.lat || !disaster.lng || !disaster.type) {
                console.warn('Skipping invalid disaster data:', disaster);
                return;
            }
            
            // Use appropriate icon or fallback to default
            const icon = disasterIcons[disaster.type] || disasterIcons.earthquake;
            
            const marker = L.marker([disaster.lat, disaster.lng], {
                icon: icon
            });
            
            // Format date for display
            let formattedDate = 'Unknown';
            if (disaster.reported) {
                const reportDate = new Date(disaster.reported);
                if (!isNaN(reportDate.getTime())) {
                    formattedDate = reportDate.toLocaleString();
                }
            }
            
            // Create popup content with data validation
            const popupContent = `
                <div class="disaster-popup">
                    <h3>${disaster.title}</h3>
                    <p class="disaster-type ${disaster.type}">Type: ${disaster.type.charAt(0).toUpperCase() + disaster.type.slice(1)}</p>
                    <p class="disaster-severity ${disaster.severity}">Severity: ${disaster.severity.charAt(0).toUpperCase() + disaster.severity.slice(1)}</p>
                    <p><strong>Location:</strong> ${disaster.location}</p>
                    <p><strong>Reported:</strong> ${formattedDate}</p>
                    <p><strong>Affected:</strong> ${disaster.affected ? disaster.affected.toLocaleString() : 'Unknown'} people</p>
                    <p><strong>Status:</strong> ${disaster.status.charAt(0).toUpperCase() + disaster.status.slice(1)}</p>
                    <p>${disaster.description}</p>
                    <div class="popup-actions">
                        <button class="view-details-btn" data-id="${disaster.id}">View Details</button>
                        <button class="assign-resources-btn" data-id="${disaster.id}">Assign Resources</button>
                    </div>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            marker.addTo(map);
            markers[disaster.id] = marker;
            
            // Add click event for popup buttons
            marker.on('popupopen', () => {
                setTimeout(() => {
                    const viewBtn = document.querySelector(`.view-details-btn[data-id="${disaster.id}"]`);
                    const assignBtn = document.querySelector(`.assign-resources-btn[data-id="${disaster.id}"]`);
                    
                    if (viewBtn) {
                        viewBtn.addEventListener('click', () => {
                            alert(`Viewing detailed information for ${disaster.title}`);
                            // In a real app, this would open a detailed view
                        });
                    }
                    
                    if (assignBtn) {
                        assignBtn.addEventListener('click', () => {
                            // Switch to resources tab
                            activateTab('resources');
                            alert(`Assigning resources to ${disaster.title}`);
                        });
                    }
                }, 100);
            });
        });
    }
    
    // Initial render of all markers
    renderMarkers();
    
    // Tab navigation functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    function activateTab(tabName) {
        // Deactivate all tabs
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Activate selected tab
        const selectedBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        const selectedPane = document.getElementById(`${tabName}-tab`);
        
        if (selectedBtn && selectedPane) {
            selectedBtn.classList.add('active');
            selectedPane.classList.add('active');
        }
    }
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            activateTab(tabName);
        });
    });
    
    // Resource tabs functionality
    const resourceTabs = document.querySelectorAll('.resource-tab');
    const resourceContents = document.querySelectorAll('.resource-content');
    
    resourceTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all resource tabs and content
            resourceTabs.forEach(t => t.classList.remove('active'));
            resourceContents.forEach(c => c.classList.remove('active'));
            
            // Activate selected resource tab and content
            const resourceType = tab.getAttribute('data-resource');
            tab.classList.add('active');
            document.getElementById(`${resourceType}-content`).classList.add('active');
        });
    });
    
    // Search and filter functionality
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const filterType = document.getElementById('filter-type');
    const filterSeverity = document.getElementById('filter-severity');
    const filterState = document.getElementById('filter-state');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const typeFilter = filterType.value;
        const severityFilter = filterSeverity.value;
        const stateFilter = filterState.value;
        const fromDate = dateFrom.value ? new Date(dateFrom.value) : null;
        const toDate = dateTo.value ? new Date(dateTo.value) : null;
        
        const filteredDisasters = disasters.filter(disaster => {
            // Search term filter
            const matchesSearch = searchTerm === '' || 
                disaster.title.toLowerCase().includes(searchTerm) || 
                disaster.description.toLowerCase().includes(searchTerm) ||
                disaster.location.toLowerCase().includes(searchTerm);
            
            // Type filter
            const matchesType = typeFilter === 'all' || disaster.type === typeFilter;
            
            // Severity filter
            const matchesSeverity = severityFilter === 'all' || disaster.severity === severityFilter;
            
            // State filter (simplified - in a real app would match state properly)
            const matchesState = stateFilter === 'all' || disaster.location.toLowerCase().includes(stateFilter.replace('-', ' '));
            
            // Date range filter
            let matchesDateRange = true;
            const disasterDate = new Date(disaster.reported);
            
            if (fromDate && toDate) {
                matchesDateRange = disasterDate >= fromDate && disasterDate <= toDate;
            } else if (fromDate) {
                matchesDateRange = disasterDate >= fromDate;
            } else if (toDate) {
                matchesDateRange = disasterDate <= toDate;
            }
            
            return matchesSearch && matchesType && matchesSeverity && matchesState && matchesDateRange;
        });
        
        renderMarkers(filteredDisasters);
    }
    
    searchBtn.addEventListener('click', applyFilters);
    applyFiltersBtn.addEventListener('click', applyFilters);
    
    resetFiltersBtn.addEventListener('click', () => {
        // Reset all filter inputs
        searchInput.value = '';
        filterType.value = 'all';
        filterSeverity.value = 'all';
        filterState.value = 'all';
        dateFrom.value = '';
        dateTo.value = '';
        
        // Reset markers to show all disasters
        renderMarkers();
    });
    
    // Incident reporting form functionality
    const incidentForm = document.getElementById('incident-form');
    const useGpsBtn = document.getElementById('use-gps');
    
    useGpsBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    document.getElementById('incident-lat').value = position.coords.latitude;
                    document.getElementById('incident-lng').value = position.coords.longitude;
                    
                    // Reverse geocode to get location name (simplified)
                    document.getElementById('incident-location').value = 'Current Location';
                },
                (error) => {
                    alert('Error getting location: ' + error.message);
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    });
    
    incidentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const type = document.getElementById('incident-type').value;
        const severity = document.getElementById('incident-severity').value;
        const location = document.getElementById('incident-location').value;
        const lat = parseFloat(document.getElementById('incident-lat').value);
        const lng = parseFloat(document.getElementById('incident-lng').value);
        const description = document.getElementById('incident-description').value;
        
        // Validate form
        if (!type || !severity || !location || isNaN(lat) || isNaN(lng) || !description) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Create new disaster object
        const newDisaster = {
            id: 'D' + (disasters.length + 1).toString().padStart(3, '0'),
            lat,
            lng,
            type,
            severity,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} in ${location}`,
            description,
            location,
            reported: new Date().toISOString(),
            affected: 0, // Unknown at reporting time
            status: 'reported'
        };
        
        // Add to disasters array
        disasters.push(newDisaster);
        
        // Add marker to map
        renderMarkers();
        
        // Reset form
        incidentForm.reset();
        
        // Show confirmation
        alert('Incident reported successfully!');
        
        // Switch back to map view
        activateTab('alerts');
    });
    
    // Initialize charts for analytics
    function initCharts() {
        // Count incidents by type
        const typeData = {};
        disasters.forEach(disaster => {
            typeData[disaster.type] = (typeData[disaster.type] || 0) + 1;
        });
        
        // Prepare data for Chart.js
        const typeLabels = Object.keys(typeData).map(type => type.charAt(0).toUpperCase() + type.slice(1));
        const typeCounts = Object.values(typeData);
        const typeColors = [
            '#3498db', // flood
            '#e74c3c', // fire
            '#9b59b6', // cyclone
            '#f39c12', // earthquake
            '#e67e22', // drought
            '#d35400'  // heatwave
        ];
        
        // Incidents by Type Chart
        const typeChart = new Chart(
            document.getElementById('incidents-by-type-chart'),
            {
                type: 'pie',
                data: {
                    labels: typeLabels,
                    datasets: [{
                        data: typeCounts,
                        backgroundColor: typeColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right',
                        },
                        title: {
                            display: true,
                            text: 'Incidents by Type'
                        }
                    }
                }
            }
        );
        
        // Group incidents by date for time series
        const timeData = {};
        disasters.forEach(disaster => {
            const date = disaster.reported.split('T')[0];
            timeData[date] = (timeData[date] || 0) + 1;
        });
        
        // Sort dates
        const sortedDates = Object.keys(timeData).sort();
        const dateCounts = sortedDates.map(date => timeData[date]);
        
        // Incidents Over Time Chart
        const timeChart = new Chart(
            document.getElementById('incidents-over-time-chart'),
            {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [{
                        label: 'Number of Incidents',
                        data: dateCounts,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.2)',
                        tension: 0.1,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Incidents Over Time'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Incidents'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        }
                    }
                }
            }
        );
        
        // Resource usage data (simulated)
        const resourceData = {
            labels: ['Ambulances', 'Rescue Teams', 'Medical Staff', 'Shelters', 'Food Supplies'],
            datasets: [{
                label: 'Available',
                data: [65, 40, 80, 55, 70],
                backgroundColor: 'rgba(46, 204, 113, 0.5)',
            }, {
                label: 'Deployed',
                data: [35, 60, 20, 45, 30],
                backgroundColor: 'rgba(231, 76, 60, 0.5)',
            }]
        };
        
        // Resource Usage Chart
        const resourceChart = new Chart(
            document.getElementById('resource-usage-chart'),
            {
                type: 'bar',
                data: resourceData,
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Resource Allocation'
                        },
                    },
                    scales: {
                        x: {
                            stacked: true,
                        },
                        y: {
                            stacked: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Percentage (%)'
                            }
                        }
                    }
                }
            }
        );
    }
    
    // Export functionality
    document.getElementById('export-pdf').addEventListener('click', () => {
        alert('Exporting analytics as PDF...');
        // In a real app, this would generate a PDF
    });
    
    document.getElementById('export-excel').addEventListener('click', () => {
        alert('Exporting analytics as Excel...');
        // In a real app, this would generate an Excel file
    });
    
    // Resource assignment functionality
    const assignButtons = document.querySelectorAll('.assign-btn');
    assignButtons.forEach(button => {
        button.addEventListener('click', () => {
            const resourceId = button.closest('.resource-card').querySelector('.resource-id').textContent;
            alert(`Assigning ${resourceId} to incident. Please select an incident from the map.`);
            // In a real app, this would open a selection interface
        });
    });
    
    // Control panel toggle functionality
    const panelToggle = document.querySelector('.panel-toggle');
    const controlPanel = document.querySelector('.control-panel');
    
    panelToggle.addEventListener('click', () => {
        controlPanel.classList.toggle('collapsed');
    });
    
    // Initialize charts when analytics tab is first clicked
    let chartsInitialized = false;
    document.querySelector('.tab-btn[data-tab="analytics"]').addEventListener('click', () => {
        if (!chartsInitialized) {
            setTimeout(initCharts, 100); // Small delay to ensure canvas is visible
            chartsInitialized = true;
        }
    });
    
    // Add CSS for disaster icons and popups
    const style = document.createElement('style');
    style.textContent = `
        .disaster-icon {
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
        }
        
        .disaster-icon .icon-inner {
            width: 100%;
            height: 100%;
            border-radius: 50%;
        }
        
        .disaster-icon.flood .icon-inner {
            background-color: #3498db;
        }
        
        .disaster-icon.fire .icon-inner {
            background-color: #e74c3c;
        }
        
        .disaster-icon.cyclone .icon-inner {
            background-color: #9b59b6;
        }
        
        .disaster-icon.earthquake .icon-inner {
            background-color: #f39c12;
        }
        
        .disaster-icon.drought .icon-inner {
            background-color: #e67e22;
        }
        
        .disaster-icon.heatwave .icon-inner {
            background-color: #d35400;
        }
        
        .disaster-popup {
            min-width: 200px;
        }
        
        .disaster-popup h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        
        .disaster-popup p {
            margin: 5px 0;
            font-size: 13px;
        }
        
        .disaster-type, .disaster-severity {
            font-weight: bold;
        }
        
        .disaster-type.flood {
            color: #3498db;
        }
        
        .disaster-type.fire {
            color: #e74c3c;
        }
        
        .disaster-type.cyclone {
            color: #9b59b6;
        }
        
        .disaster-type.earthquake {
            color: #f39c12;
        }
        
        .disaster-type.drought {
            color: #e67e22;
        }
        
        .disaster-type.heatwave {
            color: #d35400;
        }
        
        .disaster-severity.high {
            color: #e74c3c;
        }
        
        .disaster-severity.medium {
            color: #f39c12;
        }
        
        .disaster-severity.low {
            color: #2ecc71;
        }
        
        .control-panel.collapsed {
            transform: translateX(100%);
        }
        
        .popup-actions {
            display: flex;
            gap: 5px;
            margin-top: 10px;
        }
        
        .popup-actions button {
            flex: 1;
            padding: 5px;
            border: none;
            border-radius: 3px;
            background-color: #f0f0f0;
            cursor: pointer;
            font-size: 12px;
        }
        
        .view-details-btn {
            color: #3498db;
        }
        
        .assign-resources-btn {
            color: #27ae60;
        }
    `;
    document.head.appendChild(style);
});