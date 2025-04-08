/**
 * maze-search.js
 * 
 * This module implements a maze generation and search algorithm visualization
 * based on breadth-first and depth-first search algorithms.
 */

class MazeSearch {
    /**
     * Create a new maze search visualization
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // DOM element references
        this.mazeContainer = document.getElementById('maze-container');
        this.gridSizeSlider = document.getElementById('grid-size');
        this.gridSizeValue = document.getElementById('grid-size-value');
        this.obstacleDensitySlider = document.getElementById('obstacle-density');
        this.obstacleDensityValue = document.getElementById('obstacle-density-value');
        this.searchAlgorithmSelect = document.getElementById('search-algorithm');
        this.algorithmDescription = document.getElementById('algorithm-description');
        this.generateMazeButton = document.getElementById('generate-maze');
        this.solveMazeButton = document.getElementById('solve-maze');
        this.stepSolveButton = document.getElementById('step-solve');
        this.resetMazeButton = document.getElementById('reset-maze');
        this.nodesVisitedElement = document.getElementById('nodes-visited');
        this.pathLengthElement = document.getElementById('path-length');
        this.searchStatusElement = document.getElementById('search-status');
        
        // Maze parameters
        this.gridSize = parseInt(this.gridSizeSlider.value);
        this.obstacleDensity = parseInt(this.obstacleDensitySlider.value);
        this.searchAlgorithm = this.searchAlgorithmSelect.value;
        
        // Maze state
        this.grid = [];
        this.obstacles = new Set();
        this.start = [0, 0];
        this.goal = [this.gridSize - 1, this.gridSize - 1];
        this.path = [];
        this.visitedNodes = new Set();
        this.frontier = [];
        this.currentNode = null;
        this.isRunning = false;
        this.isSolved = false;
        this.animationSpeed = 100; // ms between steps
        this.animationTimeout = null;
        
        // Cell size for rendering
        this.cellSize = 0;
        this.calculateCellSize();
        
        // Colors
        this.colors = {
            empty: '#ffffff',
            obstacle: '#333333',
            start: '#4CAF50',
            goal: '#F44336',
            visited: '#E1F5FE',
            frontier: '#81D4FA',
            path: '#FFC107',
            current: '#2196F3'
        };
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Generate initial maze
        this.generateMaze();
    }
    
    /**
     * Initialize event listeners for UI controls
     */
    initEventListeners() {
        // Grid size slider
        this.gridSizeSlider.addEventListener('input', () => {
            this.gridSize = parseInt(this.gridSizeSlider.value);
            this.gridSizeValue.textContent = `${this.gridSize} x ${this.gridSize}`;
            this.calculateCellSize();
        });
        
        // Obstacle density slider
        this.obstacleDensitySlider.addEventListener('input', () => {
            this.obstacleDensity = parseInt(this.obstacleDensitySlider.value);
            this.obstacleDensityValue.textContent = `${this.obstacleDensity}%`;
        });
        
        // Search algorithm select
        this.searchAlgorithmSelect.addEventListener('change', () => {
            this.searchAlgorithm = this.searchAlgorithmSelect.value;
            this.updateAlgorithmDescription();
        });
        
        // Generate maze button
        this.generateMazeButton.addEventListener('click', () => {
            this.generateMaze();
        });
        
        // Solve maze button
        this.solveMazeButton.addEventListener('click', () => {
            this.solveMaze();
        });
        
        // Step solve button
        this.stepSolveButton.addEventListener('click', () => {
            this.stepSolve();
        });
        
        // Reset maze button
        this.resetMazeButton.addEventListener('click', () => {
            this.resetMaze();
        });
        
        // Update algorithm description initially
        this.updateAlgorithmDescription();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.calculateCellSize();
            this.renderMaze();
        });
    }
    
    /**
     * Update the algorithm description based on the selected algorithm
     */
    updateAlgorithmDescription() {
        if (this.searchAlgorithm === 'bfs') {
            this.algorithmDescription.textContent = 'Explores all neighbors at the current depth before moving deeper. Guarantees shortest path.';
        } else if (this.searchAlgorithm === 'dfs') {
            this.algorithmDescription.textContent = 'Explores as far as possible along each branch before backtracking. Memory efficient but may not find shortest path.';
        }
    }
    
    /**
     * Calculate the cell size based on the container size and grid size
     */
    calculateCellSize() {
        const containerWidth = this.mazeContainer.clientWidth;
        const containerHeight = this.mazeContainer.clientHeight || 500; // Default height if not set
        
        // Calculate cell size to fit the container
        this.cellSize = Math.floor(Math.min(
            containerWidth / this.gridSize,
            containerHeight / this.gridSize
        ));
        
        // Ensure minimum cell size
        this.cellSize = Math.max(this.cellSize, 15);
    }
    
    /**
     * Generate a new maze with random obstacles
     */
    generateMaze() {
        // Reset state
        this.resetState();
        
        // Create empty grid
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        
        // Set start and goal positions
        this.start = [0, 0];
        this.goal = [this.gridSize - 1, this.gridSize - 1];
        
        // Generate obstacles
        this.obstacles = new Set();
        const totalCells = this.gridSize * this.gridSize;
        const numObstacles = Math.floor(totalCells * (this.obstacleDensity / 100));
        
        while (this.obstacles.size < numObstacles) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            
            // Don't place obstacles at start or goal
            if ((x === this.start[0] && y === this.start[1]) || 
                (x === this.goal[0] && y === this.goal[1])) {
                continue;
            }
            
            const key = `${x},${y}`;
            this.obstacles.add(key);
            this.grid[x][y] = 1; // 1 represents an obstacle
        }
        
        // Render the maze
        this.renderMaze();
        
        // Enable solve button
        this.solveMazeButton.disabled = false;
        this.stepSolveButton.disabled = false;
        
        // Update status
        this.searchStatusElement.textContent = 'Ready';
    }
    
    /**
     * Reset the maze state for a new search
     */
    resetMaze() {
        // Stop any running animation
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
        
        // Reset search state but keep the maze
        this.visitedNodes = new Set();
        this.frontier = [];
        this.path = [];
        this.currentNode = null;
        this.isRunning = false;
        this.isSolved = false;
        
        // Reset statistics
        this.nodesVisitedElement.textContent = '0';
        this.pathLengthElement.textContent = '0';
        this.searchStatusElement.textContent = 'Ready';
        
        // Enable buttons
        this.solveMazeButton.disabled = false;
        this.stepSolveButton.disabled = false;
        
        // Re-render the maze
        this.renderMaze();
    }
    
    /**
     * Reset the entire state (used when generating a new maze)
     */
    resetState() {
        // Stop any running animation
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
        
        // Reset everything
        this.grid = [];
        this.obstacles = new Set();
        this.visitedNodes = new Set();
        this.frontier = [];
        this.path = [];
        this.currentNode = null;
        this.isRunning = false;
        this.isSolved = false;
        
        // Reset statistics
        this.nodesVisitedElement.textContent = '0';
        this.pathLengthElement.textContent = '0';
        this.searchStatusElement.textContent = 'Generating maze...';
    }
    
    /**
     * Render the maze using SVG
     */
    renderMaze() {
        // Clear the container
        this.mazeContainer.innerHTML = '';
        
        // Create SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const width = this.cellSize * this.gridSize;
        const height = this.cellSize * this.gridSize;
        
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.style.display = 'block';
        svg.style.margin = '0 auto';
        
        // Create a group for the grid cells
        const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // Draw the grid cells
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const cell = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                cell.setAttribute('x', x * this.cellSize);
                cell.setAttribute('y', y * this.cellSize);
                cell.setAttribute('width', this.cellSize);
                cell.setAttribute('height', this.cellSize);
                cell.setAttribute('stroke', '#ccc');
                cell.setAttribute('stroke-width', '1');
                
                // Set fill color based on cell type
                const key = `${x},${y}`;
                
                if (x === this.start[0] && y === this.start[1]) {
                    // Start cell
                    cell.setAttribute('fill', this.colors.start);
                } else if (x === this.goal[0] && y === this.goal[1]) {
                    // Goal cell
                    cell.setAttribute('fill', this.colors.goal);
                } else if (this.obstacles.has(key)) {
                    // Obstacle
                    cell.setAttribute('fill', this.colors.obstacle);
                } else if (this.isNodeInPath(x, y)) {
                    // Path
                    cell.setAttribute('fill', this.colors.path);
                } else if (this.currentNode && this.currentNode[0] === x && this.currentNode[1] === y) {
                    // Current node being explored
                    cell.setAttribute('fill', this.colors.current);
                } else if (this.isNodeInFrontier(x, y)) {
                    // Frontier node
                    cell.setAttribute('fill', this.colors.frontier);
                } else if (this.visitedNodes.has(key)) {
                    // Visited node
                    cell.setAttribute('fill', this.colors.visited);
                } else {
                    // Empty cell
                    cell.setAttribute('fill', this.colors.empty);
                }
                
                gridGroup.appendChild(cell);
            }
        }
        
        // Add labels for start and goal
        this.addLabel(gridGroup, this.start[0], this.start[1], 'S');
        this.addLabel(gridGroup, this.goal[0], this.goal[1], 'G');
        
        // Add the grid group to the SVG
        svg.appendChild(gridGroup);
        
        // Add the SVG to the container
        this.mazeContainer.appendChild(svg);
    }
    
    /**
     * Add a text label to a cell
     */
    addLabel(group, x, y, text) {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x * this.cellSize + this.cellSize / 2);
        label.setAttribute('y', y * this.cellSize + this.cellSize / 2);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.setAttribute('font-size', Math.max(12, this.cellSize / 2));
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('fill', '#fff');
        label.textContent = text;
        group.appendChild(label);
    }
    
    /**
     * Check if a node is in the current path
     */
    isNodeInPath(x, y) {
        return this.path.some(node => node[0] === x && node[1] === y);
    }
    
    /**
     * Check if a node is in the frontier
     */
    isNodeInFrontier(x, y) {
        return this.frontier.some(node => node[0] === x && node[1] === y);
    }
    
    /**
     * Get valid neighbors of a node
     */
    getNeighbors(node) {
        const [x, y] = node;
        const neighbors = [];
        
        // Check all 4 adjacent cells (no diagonals)
        const directions = [
            [0, 1],  // right
            [1, 0],  // down
            [0, -1], // left
            [-1, 0]  // up
        ];
        
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            
            // Check if the neighbor is within bounds
            if (nx < 0 || nx >= this.gridSize || ny < 0 || ny >= this.gridSize) {
                continue;
            }
            
            // Check if the neighbor is not an obstacle
            const key = `${nx},${ny}`;
            if (this.obstacles.has(key)) {
                continue;
            }
            
            neighbors.push([nx, ny]);
        }
        
        return neighbors;
    }
    
    /**
     * Initialize the search algorithm
     */
    initializeSearch() {
        // Reset search state
        this.visitedNodes = new Set();
        this.frontier = [];
        this.path = [];
        this.currentNode = null;
        
        // Add start node to frontier
        if (this.searchAlgorithm === 'bfs') {
            // For BFS, use a queue (FIFO)
            this.frontier = [this.start];
        } else {
            // For DFS, use a stack (LIFO)
            this.frontier = [this.start];
        }
        
        // Mark start as visited
        this.visitedNodes.add(`${this.start[0]},${this.start[1]}`);
        
        // Initialize parent map for path reconstruction
        this.parentMap = new Map();
        
        // Update statistics
        this.nodesVisitedElement.textContent = '1'; // Start node
        this.pathLengthElement.textContent = '0';
        this.searchStatusElement.textContent = 'Searching...';
        
        // Set running state
        this.isRunning = true;
        this.isSolved = false;
    }
    
    /**
     * Perform one step of the search algorithm
     */
    stepSolve() {
        // Initialize search if not already running
        if (!this.isRunning) {
            this.initializeSearch();
        }
        
        // Check if frontier is empty
        if (this.frontier.length === 0) {
            this.searchStatusElement.textContent = 'No path found';
            this.isRunning = false;
            return false;
        }
        
        // Get the next node from the frontier
        if (this.searchAlgorithm === 'bfs') {
            // For BFS, take from the front (queue)
            this.currentNode = this.frontier.shift();
        } else {
            // For DFS, take from the end (stack)
            this.currentNode = this.frontier.pop();
        }
        
        const [x, y] = this.currentNode;
        const currentKey = `${x},${y}`;
        
        // Check if we've reached the goal
        if (x === this.goal[0] && y === this.goal[1]) {
            // Reconstruct the path
            this.reconstructPath();
            this.searchStatusElement.textContent = 'Path found!';
            this.isRunning = false;
            this.isSolved = true;
            return false;
        }
        
        // Get neighbors
        const neighbors = this.getNeighbors(this.currentNode);
        
        // Process each neighbor
        for (const neighbor of neighbors) {
            const [nx, ny] = neighbor;
            const neighborKey = `${nx},${ny}`;
            
            // Skip if already visited
            if (this.visitedNodes.has(neighborKey)) {
                continue;
            }
            
            // Add to frontier and mark as visited
            this.frontier.push(neighbor);
            this.visitedNodes.add(neighborKey);
            
            // Update parent map for path reconstruction
            this.parentMap.set(neighborKey, this.currentNode);
        }
        
        // Update statistics
        this.nodesVisitedElement.textContent = this.visitedNodes.size;
        
        // Render the updated state
        this.renderMaze();
        
        return true;
    }
    
    /**
     * Reconstruct the path from start to goal
     */
    reconstructPath() {
        this.path = [];
        let current = this.goal;
        
        while (current[0] !== this.start[0] || current[1] !== this.start[1]) {
            this.path.push(current);
            const key = `${current[0]},${current[1]}`;
            current = this.parentMap.get(key);
            
            // Safety check
            if (!current) break;
        }
        
        // Add the start node
        this.path.push(this.start);
        
        // Reverse to get path from start to goal
        this.path.reverse();
        
        // Update path length
        this.pathLengthElement.textContent = this.path.length - 1; // -1 because we don't count the start node
        
        // Render the path
        this.renderMaze();
    }
    
    /**
     * Solve the maze automatically with animation
     */
    solveMaze() {
        // Disable buttons during animation
        this.solveMazeButton.disabled = true;
        this.stepSolveButton.disabled = true;
        
        // Initialize search if not already running
        if (!this.isRunning) {
            this.initializeSearch();
        }
        
        // Define the animation step function
        const animateStep = () => {
            const continueSearch = this.stepSolve();
            
            if (continueSearch) {
                // Schedule the next step
                this.animationTimeout = setTimeout(animateStep, this.animationSpeed);
            } else {
                // Enable step button when animation is done
                this.stepSolveButton.disabled = false;
                
                // Only re-enable solve button if not solved
                if (!this.isSolved) {
                    this.solveMazeButton.disabled = false;
                }
            }
        };
        
        // Start the animation
        animateStep();
    }
}

// Initialize the maze search visualization when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const mazeSearch = new MazeSearch();
}); 