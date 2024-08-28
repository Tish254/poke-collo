$(document).ready(function () {
  const API_BASE_URL = "https://pokeapi.co/api/v2/";
  const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
  let currentPage = 1;
  const pokemonPerPage = 12;
  let allPokemonData = [];
  let currentFilter = "";

  // Function to fetch data from API
  async function fetchData(url) {
    console.log(url);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      return await response.json();
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }

  // Function to get random Pokemon
  async function getRandomPokemon(count = 12) {
    const types = [
      "normal",
      "fire",
      "water",
      "electric",
      "grass",
      "ice",
      "fighting",
      "poison",
      "ground",
      "flying",
      "psychic",
      "bug",
      "rock",
      "ghost",
      "dragon",
      "dark",
      "steel",
      "fairy",
    ];
    const pokemonPromises = [];

    for (let i = 0; i < count; i++) {
      const randomType = types[Math.floor(Math.random() * types.length)];
      pokemonPromises.push(getRandomPokemonByType(randomType));
    }

    return (await Promise.all(pokemonPromises)).filter(
      (pokemon) => pokemon !== null
    );
  }

  async function getRandomPokemonByType(type) {
    try {
      const typeData = await fetchData(`${API_BASE_URL}type/${type}`);
      const randomPokemon =
        typeData.pokemon[Math.floor(Math.random() * typeData.pokemon.length)]
          .pokemon;
      return fetchData(randomPokemon.url);
    } catch (error) {
      console.error(`Error fetching random ${type} type Pokemon:`, error);
      return null;
    }
  }

  // Function to change background based on Pokemon type
  function changeBackgroundByType(type) {
    $("body")
      .removeClass(function (index, className) {
        return (className.match(/(^|\s)bg-\S+/g) || []).join(" ");
      })
      .addClass(`bg-${type.toLowerCase()}`);
  }

  // Function to create a Pokemon card
  function createPokemonCard(pokemon) {
    const types = pokemon.types
      .map(
        (type) =>
          `<span class="inline-block bg-${type.type.name}-200 text-${type.type.name}-800 px-2 py-1 rounded-full text-sm">${type.type.name}</span>`
      )
      .join(" ");

    return `
            <div class="bg-white rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition duration-300" data-type="${pokemon.types[0].type.name}">
                <div class="bg-gray-200 p-4">
                    <img src="placeholder.png" data-src="${pokemon.sprites.other["official-artwork"].front_default}" alt="${pokemon.name}" class="w-full h-48 object-contain lazy-image fade-in" onload="this.style.opacity=1" onerror="this.onerror=null; this.src='fallback-pokemon.png';">
                </div>
                <div class="p-4">
                    <h3 class="text-xl font-semibold mb-2 capitalize">${pokemon.name}</h3>
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${types}
                    </div>
                    <button class="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center view-details" data-id="${pokemon.id}">
                        <i class="fas fa-info-circle mr-2"></i> View Details
                    </button>
                </div>
            </div>
        `;
  }

  // Function to load Pokemon
  async function loadPokemon(page, filter = "") {
    showLoading();
    try {
      if (!allPokemonData.length || page === 1) {
        allPokemonData = await getRandomPokemon(pokemonPerPage);
      }

      let filteredPokemon = allPokemonData;
      if (filter) {
        filteredPokemon = allPokemonData.filter((pokemon) =>
          pokemon.types.some((type) => type.type.name === filter)
        );
      }

      const pokemonList = $("#pokemon-list");
      pokemonList.empty();

      filteredPokemon.forEach((pokemon) => {
        if (pokemon) {
          pokemonList.append(createPokemonCard(pokemon));
        }
      });

      updatePagination(filteredPokemon.length);
      hideLoading();
      lazyLoadImages();
      preloadNextPageImages(page);
    } catch (error) {
      console.error("Error loading Pokemon:", error);
      showError("Failed to load Pokemon. Please try again.");
      hideLoading();
    }
  }

  // Function to update pagination
  function updatePagination(totalPokemon) {
    const totalPages = Math.max(1, Math.ceil(totalPokemon / pokemonPerPage));
    const pagination = $("#pagination");
    pagination.empty();

    if (totalPages > 1) {
      pagination.append(
        `<button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-300 prev-page ${
          currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
        }">Previous</button>`
      );

      for (let i = 1; i <= Math.min(5, totalPages); i++) {
        pagination.append(
          `<button class="px-4 py-2 ${
            currentPage === i
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          } rounded-md hover:bg-gray-300 transition duration-300 page-number" data-page="${i}">${i}</button>`
        );
      }

      pagination.append(
        `<button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-300 next-page ${
          currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""
        }">Next</button>`
      );
    }
  }

  // Event listener for pagination
  $("#pagination").on(
    "click",
    ".page-number, .prev-page, .next-page",
    function (e) {
      e.preventDefault();
      if ($(this).hasClass("prev-page") && currentPage > 1) {
        currentPage--;
      } else if (
        $(this).hasClass("next-page") &&
        currentPage < Math.ceil(allPokemonData.length / pokemonPerPage)
      ) {
        currentPage++;
      } else if ($(this).hasClass("page-number")) {
        currentPage = parseInt($(this).data("page"));
      }
      loadPokemon(currentPage, currentFilter);
    }
  );

  // Function to search Pokemon
  async function searchPokemon(query) {
    showLoading();
    try {
      const pokemon = await fetchData(
        `${API_BASE_URL}pokemon/${query.toLowerCase()}`
      );
      const pokemonList = $("#pokemon-list");
      pokemonList.empty();
      pokemonList.append(createPokemonCard(pokemon));
      $("#pagination").hide();
      hideLoading();
    } catch (error) {
      console.error("Error searching Pokemon:", error);
      showError("Pokemon not found. Please try again.");
      hideLoading();
    }
  }

  // Event listener for search
  $('input[type="text"]').on("keyup", function (e) {
    if (e.key === "Enter") {
      const query = $(this).val().trim();
      if (query) {
        searchPokemon(query);
      } else {
        loadPokemon(currentPage, currentFilter);
        $("#pagination").show();
      }
    }
  });

  // Function to show Pokemon details
  async function showPokemonDetails(pokemon) {
    showLoading();
    try {
      const species = await fetchData(pokemon.species.url);
      const evolutionChain = await fetchData(species.evolution_chain.url);
      const description = species.flavor_text_entries.find(
        (entry) => entry.language.name === "en"
      ).flavor_text;

      const modal = `
                <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="pokemon-modal">
                    <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div class="flex justify-between items-center">
                            <h3 class="text-2xl font-bold capitalize">${
                              pokemon.name
                            }</h3>
                            <button class="text-black close-modal">&times;</button>
                        </div>
                        <div class="mt-4">
                            <img src="${pokemon.sprites.front_default}" alt="${
        pokemon.name
      }" class="w-48 h-48 mx-auto">
                            <p class="mt-2">${description}</p>
                            <h4 class="font-bold mt-4">Abilities:</h4>
                            <ul class="list-disc list-inside">
                                ${pokemon.abilities
                                  .map(
                                    (ability) =>
                                      `<li>${ability.ability.name}</li>`
                                  )
                                  .join("")}
                            </ul>
                            <h4 class="font-bold mt-4">Stats:</h4>
                            ${pokemon.stats
                              .map(
                                (stat) => `
                                <div class="mt-2">
                                    <span class="font-semibold">${
                                      stat.stat.name
                                    }:</span>
                                    <div class="bg-gray-200 rounded-full h-2.5 mt-1">
                                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${
                                          (stat.base_stat / 255) * 100
                                        }%"></div>
                                    </div>
                                </div>
                            `
                              )
                              .join("")}
                            <h4 class="font-bold mt-4">Evolution Chain:</h4>
                            <div id="evolution-chain" class="flex justify-around items-center mt-2">
                                ${createEvolutionChain(evolutionChain.chain)}
                            </div>
                            <h4 class="font-bold mt-4">Related Pokemon:</h4>
                            <div id="related-pokemon" class="flex flex-wrap gap-2 mt-2">
                                ${await getRelatedPokemon(pokemon)}
                            </div>
                        </div>
                    </div>
                </div>
            `;

      $("body").append(modal);
      hideLoading();

      $(".close-modal").on("click", function () {
        $("#pokemon-modal").remove();
      });
    } catch (error) {
      console.error("Error showing Pokemon details:", error);
      showError("Failed to load Pokemon details. Please try again.");
      hideLoading();
    }
  }

  // Function to create evolution chain
  function createEvolutionChain(chain) {
    let evolutionHtml = `<div class="text-center"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
      chain.species.url.split("/")[6]
    }.png" alt="${
      chain.species.name
    }" class="w-20 h-20 mx-auto"><p class="capitalize">${
      chain.species.name
    }</p></div>`;

    if (chain.evolves_to.length > 0) {
      evolutionHtml +=
        `<div class="text-4xl">&rarr;</div>` +
        createEvolutionChain(chain.evolves_to[0]);
    }

    return evolutionHtml;
  }

  // Function to get related Pokemon
  async function getRelatedPokemon(pokemon) {
    const type = pokemon.types[0].type.name;
    const relatedPokemon = await fetchData(`${API_BASE_URL}type/${type}`);
    return relatedPokemon.pokemon
      .slice(0, 5)
      .map(
        (p) =>
          `<div class="text-center"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
            p.pokemon.url.split("/")[6]
          }.png" alt="${
            p.pokemon.name
          }" class="w-16 h-16"><p class="text-xs capitalize">${
            p.pokemon.name
          }</p></div>`
      )
      .join("");
  }

  // Event listener for "View Details" button
  $("#pokemon-list").on("click", ".view-details", async function () {
    const pokemonId = $(this).data("id");
    const pokemon = allPokemonData.find((p) => p.id === pokemonId);
    const type = pokemon.types[0].type.name;
    changeBackgroundByType(type);
    await showPokemonDetails(pokemon);
  });

  // Add event listener for Pokemon card hover
  $("#pokemon-list").on("mouseenter", ".bg-white", function () {
    const type = $(this).data("type");
    changeBackgroundByType(type);
  });

  // Reset background when mouse leaves Pokemon list
  $("#pokemon-list").on("mouseleave", function () {
    $("body")
      .removeClass(function (index, className) {
        return (className.match(/(^|\s)bg-\S+/g) || []).join(" ");
      })
      .addClass("bg-gray-100");
  });

  // Function to show loading state
  function showLoading() {
    $("body").append(
      '<div id="loading" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center"><div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div></div>'
    );
  }

  // Function to hide loading state
  function hideLoading() {
    $("#loading").remove();
  }

  // Function to show error message
  function showError(message) {
    const error = `<div id="error" class="fixed top-0 left-0 right-0 bg-red-500 text-white p-4 text-center">${message}</div>`;
    $("body").append(error);
    setTimeout(() => $("#error").remove(), 3000);
  }

  // Function to initialize type filter
  async function initializeTypeFilter() {
    try {
      const types = await fetchData(`${API_BASE_URL}type`);
      const filterButton = $("#filter-button");
      const filterDropdown = $(
        '<div id="filter-dropdown" class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 hidden z-10"></div>'
      );

      filterDropdown.append(
        `<a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 filter-option" data-type="">Clear Filter</a>`
      );

      types.results.forEach((type) => {
        filterDropdown.append(
          `<a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 filter-option" data-type="${type.name}">${type.name}</a>`
        );
      });

      filterButton.after(filterDropdown);

      filterButton.on("click", function (e) {
        e.stopPropagation();
        filterDropdown.toggleClass("hidden");
      });
      $(document).on("click", function (e) {
        if (!$(e.target).closest("#filter-button, #filter-dropdown").length) {
          filterDropdown.addClass("hidden");
        }
      });

      filterDropdown.on("click", ".filter-option", function (e) {
        e.preventDefault();
        currentFilter = $(this).data("type");
        filterButton.text(
          currentFilter ? `Filter: ${currentFilter}` : "Filter"
        );
        filterDropdown.addClass("hidden");
        currentPage = 1;
        loadPokemon(currentPage, currentFilter);
      });
    } catch (error) {
      console.error("Error initializing type filter:", error);
      showError("Failed to load Pokemon types. Please refresh the page.");
    }
  }

  // Function to initialize navigation
  function initializeNavigation() {
    const nav = $("nav ul");
    nav.empty();
    nav.append(`
            <li><a href="#" class="text-white hover:text-gray-300 transition duration-300">Home</a></li>
            <li><a href="#" class="text-white hover:text-gray-300 transition duration-300">Types</a></li>
            <li><a href="#" class="text-white hover:text-gray-300 transition duration-300">About</a></li>
        `);
  }
  function lazyLoadImages() {
    const images = document.querySelectorAll(".lazy-image");
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove("lazy-image");
          observer.unobserve(img);
        }
      });
    }, options);

    images.forEach((img) => observer.observe(img));
  }

  // New function to preload next page images
  function preloadNextPageImages(page) {
    const nextPage = page + 1;
    const offset = nextPage * pokemonPerPage;
    fetchData(
      `${API_BASE_URL}pokemon?limit=${pokemonPerPage}&offset=${offset}`
    ).then((data) =>
      data.results.forEach((pokemon) => {
        const img = new Image();
        img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${
          pokemon.url.split("/")[6]
        }.png`;
      })
    );
  }
  // Initial load
  loadPokemon(currentPage);
  initializeTypeFilter();
  initializeNavigation();
});
