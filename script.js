document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map centered on India
    const map = L.map('map').setView([20.5937, 78.9629], 5);
    
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
    
    // Sample disaster data
    const disasters = [
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
    ];
    
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
        
        // Add filtered markers
        disasterList.forEach(disaster => {
            const marker = L.marker([disaster.lat, disaster.lng], {
                icon: disasterIcons[disaster.type]
            });
            
            // Format date for display
            const reportDate = new Date(disaster.reported);
            const formattedDate = reportDate.toLocaleString();
            
            // Create popup content
            const popupContent = `
                <div class="disaster-popup">
                    <h3>${disaster.title}</h3>
                    <p class="disaster-type ${disaster.type}">Type: ${disaster.type.charAt(0).toUpperCase() + disaster.type.slice(1)}</p>
                    <p class="disaster-severity ${disaster.severity}">Severity: ${disaster.severity.charAt(0).toUpperCase() + disaster.severity.slice(1)}</p>
                    <p><strong>Location:</strong> ${disaster.location}</p>
                    <p><strong>Reported:</strong> ${formattedDate}</p>
                    <p><strong>Affected:</strong> ${disaster.affected.toLocaleString()} people</p>
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