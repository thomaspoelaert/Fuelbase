<script>
  export let size = 48;
  export let title = 'FuelBase';
</script>

<svg
  class="fuelbase-mark"
  width={size}
  height={size}
  viewBox="0 0 64 64"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label={title}
>
  <circle cx="32" cy="32" r="23" stroke="currentColor" stroke-width="3.4" />
  <!-- Swim wave + forward motion. The outer ring also reads as a plate/wheel. -->
  <path d="M17 35c4.5-5 9-5 13.5 0s9 5 13.5 0" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M20 27.5c3.2-3.4 6.4-3.4 9.6 0" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" />
  <!-- Minimal fork integrated into the sport mark. -->
  <path d="M42 20v10.2c0 2.5-1.2 4.2-3.2 5.5V44" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M38.4 20v6M42 20v6M45.6 20v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
</svg>

<style>
  .fuelbase-mark { display:block; overflow:visible; }
</style>
