#!/usr/bin/env bash
# Brenner Bot Installer
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/brenner_bot/main/install.sh | bash
#   curl -fsSL ... | bash -s -- --easy-mode --verify
#
# For CI/offline:
#   ./install.sh --artifact-url file:///path/to/brenner-linux-x64 --checksum abc123...
#
# @see specs/release_artifact_matrix_v0.1.md
# @see specs/toolchain_manifest_v0.1.md

set -euo pipefail
# Propagate errexit into command substitutions on bash >= 4.4 (defensive alongside explicit checks)
shopt -s inherit_errexit 2>/dev/null || true

# -----------------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------------

REPO_OWNER="Dicklesworthstone"
REPO_NAME="brenner_bot"
TOOL_NAME="brenner"

# Default to latest release
VERSION="${BRENNER_VERSION:-latest}"

# Default install destination
DEFAULT_DEST="${HOME}/.local/bin"

# GitHub release URL base
GITHUB_RELEASE_BASE="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases"

# -----------------------------------------------------------------------------
# Globals (set by parse_args)
# -----------------------------------------------------------------------------

DEST_DIR=""
ARTIFACT_URL=""
CHECKSUM=""
EASY_MODE=false
VERIFY=false
DRY_RUN=false
VERBOSE=false
SYSTEM=false
SKIP_BRENNER=false
SKIP_NTM=false
SKIP_CASS=false
SKIP_CM=false

# Temp directory (for cleanup trap)
TEMP_DIR=""

# Resolved version cache
RESOLVED_VERSION=""

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------

log_info() {
  echo "→ $*"
}

log_error() {
  echo "ERROR: $*" >&2
}

log_warn() {
  echo "WARN: $*" >&2
}

log_debug() {
  if [[ "$VERBOSE" == "true" ]]; then
    echo "DEBUG: $*" >&2
  fi
}

curl_secure() {
  if [[ "${CURL_SECURE_ARGS_READY:-false}" != "true" ]]; then
    CURL_SECURE_ARGS=(-fsSL)
    # Prefer HTTPS-only fetches when supported (curl >= 7.52).
    if curl --help all 2>/dev/null | grep -q -- '--proto'; then
      CURL_SECURE_ARGS+=(--proto '=https' --tlsv1.2)
      # Also restrict redirect protocols when supported (curl >= 7.19.4).
      if curl --help all 2>/dev/null | grep -q -- '--proto-redir'; then
        CURL_SECURE_ARGS+=(--proto-redir '=https')
      fi
    fi
    CURL_SECURE_ARGS_READY=true
  fi

  curl "${CURL_SECURE_ARGS[@]}" "$@"
}

die() {
  log_error "$@"
  exit 1
}

# -----------------------------------------------------------------------------
# Temp Directory Helper
# -----------------------------------------------------------------------------

ensure_temp_dir() {
  if [[ -n "${TEMP_DIR}" ]]; then
    return 0
  fi

  TEMP_DIR=$(mktemp -d) || die "Failed to create temp directory"
  trap 'rm -rf "$TEMP_DIR"' EXIT
}

# -----------------------------------------------------------------------------
# Platform Detection
# -----------------------------------------------------------------------------

# Detect OS and architecture, return platform string
# Output: linux-x64, linux-arm64, darwin-arm64, darwin-x64
detect_platform() {
  local os arch

  case "$(uname -s)" in
    Linux)  os="linux" ;;
    Darwin) os="darwin" ;;
    MINGW*|MSYS*|CYGWIN*)
      die "Windows detected. Use install.ps1 instead."
      ;;
    *)
      die "Unsupported OS: $(uname -s)"
      ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64)  arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *)
      die "Unsupported architecture: $(uname -m)"
      ;;
  esac

  echo "${os}-${arch}"
}

# Get artifact name for platform
# Args: platform (e.g., linux-x64)
# Output: brenner-linux-x64
get_artifact_name() {
  local platform="$1"
  echo "${TOOL_NAME}-${platform}"
}

# -----------------------------------------------------------------------------
# Version Resolution
# -----------------------------------------------------------------------------

# Get the latest release version from GitHub
# Output: version string (without 'v' prefix)
get_latest_version() {
  local url="${GITHUB_RELEASE_BASE}/latest"
  local redirect_url

  log_debug "Fetching latest release from: ${url}"

  # Follow redirect to get version from URL
  redirect_url=$(curl_secure -w '%{url_effective}' -o /dev/null "$url" 2>/dev/null) || {
    die "Failed to fetch latest release from GitHub"
  }

  # Extract version from URL: .../releases/tag/v1.2.3 -> 1.2.3
  local version
  version=$(echo "$redirect_url" | sed -n 's|.*/tag/v\{0,1\}\([^/]*\)$|\1|p')

  if [[ -z "$version" ]]; then
    die "Could not parse version from release URL: ${redirect_url}"
  fi

  echo "$version"
}

# Resolve version string to actual version
# Args: version (e.g., "latest", "1.2.3", "v1.2.3")
# Output: version without 'v' prefix
resolve_version() {
  local version="$1"
  local resolved

  if [[ "$version" == "latest" ]]; then
    resolved=$(get_latest_version) || return 1
  else
    # Strip 'v' prefix if present
    resolved="${version#v}"
  fi

  if [[ -z "$resolved" ]]; then
    die "Resolved version is empty (requested: '${version}')"
  fi

  echo "$resolved"
}

get_resolved_version() {
  if [[ -n "${RESOLVED_VERSION}" ]]; then
    echo "${RESOLVED_VERSION}"
    return 0
  fi

  local resolved
  resolved=$(resolve_version "$VERSION") || return 1
  if [[ -z "$resolved" ]]; then
    die "Failed to resolve brenner version"
  fi

  RESOLVED_VERSION="$resolved"
  echo "${RESOLVED_VERSION}"
}

# -----------------------------------------------------------------------------
# URL Construction
# -----------------------------------------------------------------------------

# Build download URL for artifact
# Args: version, platform
# Output: full URL
build_artifact_url() {
  local version="$1"
  local platform="$2"
  local artifact_name

  if [[ -z "$version" ]]; then
    die "Cannot build artifact URL: version is empty"
  fi

  artifact_name=$(get_artifact_name "$platform")

  echo "${GITHUB_RELEASE_BASE}/download/v${version}/${artifact_name}"
}

# Build checksum URL for artifact
# Args: version, platform
# Output: full URL
build_checksum_url() {
  local version="$1"
  local platform="$2"
  local artifact_name

  if [[ -z "$version" ]]; then
    die "Cannot build checksum URL: version is empty"
  fi

  artifact_name=$(get_artifact_name "$platform")

  echo "${GITHUB_RELEASE_BASE}/download/v${version}/${artifact_name}.sha256"
}

# -----------------------------------------------------------------------------
# Toolchain Manifest (ntm/cass/cm pinning)
# -----------------------------------------------------------------------------

build_toolchain_manifest_url() {
  local version="$1"
  if [[ -z "$version" ]]; then
    die "Cannot build toolchain manifest URL: version is empty"
  fi
  echo "https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/v${version}/specs/toolchain.manifest.json"
}

fetch_toolchain_manifest() {
  if [[ -f "specs/toolchain.manifest.json" ]]; then
    echo "specs/toolchain.manifest.json"
    return 0
  fi

  local version manifest_url manifest_path
  version=$(get_resolved_version) || return 1
  manifest_url=$(build_toolchain_manifest_url "$version") || return 1

  ensure_temp_dir || return 1
  manifest_path="${TEMP_DIR}/toolchain.manifest.json"

  log_debug "Fetching toolchain manifest from: ${manifest_url}"

  curl_secure -o "$manifest_path" "$manifest_url" 2>/dev/null \
    || die "Failed to fetch toolchain manifest: ${manifest_url}"

  echo "$manifest_path"
}

manifest_get_tool_field() {
  local manifest="$1"
  local tool="$2"
  local field="$3"

  sed -n "/\"$tool\": {/,/^    }/p" "$manifest" \
    | grep -o "\"$field\": *\"[^\"]*\"" \
    | head -1 \
    | cut -d'"' -f4
}

install_upstream_tool() {
  local manifest="$1"
  local tool="$2"

  local version url args
  version=$(manifest_get_tool_field "$manifest" "$tool" "version")
  url=$(manifest_get_tool_field "$manifest" "$tool" "install_url")
  args=$(manifest_get_tool_field "$manifest" "$tool" "install_args")

  if [[ -z "$url" ]]; then
    die "Toolchain manifest missing tools.${tool}.install_url"
  fi

  log_info "Installing ${tool}${version:+ v${version}}..."
  log_info "Source: ${url}"

  local -a extra_args=()
  case "$tool" in
    ntm)
      extra_args+=("--dir=${DEST_DIR}")
      if [[ "$EASY_MODE" == "true" ]]; then
        extra_args+=(--no-shell)
      fi
      ;;
    cass|cm)
      if [[ "$SYSTEM" == "true" ]]; then
        extra_args+=(--system)
      else
        extra_args+=(--dest "$DEST_DIR")
      fi
      if [[ "$EASY_MODE" == "true" ]]; then
        extra_args+=(--easy-mode)
      fi
      if [[ "$VERIFY" == "true" ]]; then
        extra_args+=(--verify)
      fi
      ;;
    *)
      ;;
  esac

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would run: curl -fsSL \"${url}\" | bash -s -- ${args} ${extra_args[*]}"
    return 0
  fi

  # shellcheck disable=SC2086  # args is intentionally unquoted for word splitting
  curl_secure "$url" | bash -s -- $args "${extra_args[@]}"
}

fetch_checksum_from_list() {
  local list_url="$1"
  local asset_name="$2"

  local list checksum
  list=$(curl_secure "$list_url") || die "Failed to download checksum list: ${list_url}"

  checksum=$(
    echo "$list" \
      | awk -v asset="$asset_name" '$2 == asset {print $1}' \
      | head -n 1
  )

  if [[ -z "$checksum" ]]; then
    die "Checksum not found for ${asset_name} in ${list_url}"
  fi

  if ! [[ "$checksum" =~ ^[0-9a-fA-F]{64}$ ]]; then
    die "Invalid checksum format for ${asset_name} in ${list_url}: ${checksum}"
  fi

  echo "$checksum"
}

install_ntm_release() {
  local manifest="$1"

  local raw_version version_tag platform asset_name base_url tarball_url checksum_list_url checksum
  raw_version=$(manifest_get_tool_field "$manifest" "ntm" "version")
  if [[ -z "$raw_version" ]]; then
    die "Toolchain manifest missing tools.ntm.version"
  fi

  # Accept either "1.2.3" or "v1.2.3"
  raw_version="${raw_version#v}"
  version_tag="v${raw_version}"

  platform=$(detect_platform)
  case "$platform" in
    linux-x64) asset_name="ntm_${raw_version}_linux_amd64.tar.gz" ;;
    linux-arm64) asset_name="ntm_${raw_version}_linux_arm64.tar.gz" ;;
    darwin-arm64|darwin-x64) asset_name="ntm_${raw_version}_darwin_all.tar.gz" ;;
    *) die "Unsupported platform for ntm: ${platform}" ;;
  esac

  base_url="https://github.com/Dicklesworthstone/ntm/releases/download/${version_tag}"
  tarball_url="${base_url}/${asset_name}"
  checksum_list_url="${base_url}/checksums.txt"

  log_info "Installing ntm v${raw_version}..."
  log_info "Source: ${tarball_url}"
  log_info "Checksums: ${checksum_list_url}"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would download: ${tarball_url}"
    log_info "[DRY RUN] Would verify checksum from: ${checksum_list_url}"
    log_info "[DRY RUN] Would install to: ${DEST_DIR}/ntm"
    return 0
  fi

  if ! command -v tar &>/dev/null; then
    die "tar is required to install ntm from release artifacts"
  fi

  ensure_temp_dir
  local tarball_path extract_dir bin_path
  tarball_path="${TEMP_DIR}/${asset_name}"
  extract_dir="${TEMP_DIR}/ntm-extract"

  download_file "$tarball_url" "$tarball_path"
  checksum=$(fetch_checksum_from_list "$checksum_list_url" "$asset_name")
  verify_checksum "$tarball_path" "$checksum" || die "Checksum verification failed for ntm"

  mkdir -p "$extract_dir"
  tar -xzf "$tarball_path" -C "$extract_dir" || die "Failed to extract ntm tarball"

  bin_path=$(find "$extract_dir" -type f -name ntm -perm -111 | head -n 1)
  if [[ -z "$bin_path" ]]; then
    die "Could not find ntm binary in extracted archive"
  fi

  atomic_install "$bin_path" "$DEST_DIR" "ntm"
}

install_toolchain() {
  if [[ "$SKIP_NTM" == "true" && "$SKIP_CASS" == "true" && "$SKIP_CM" == "true" ]]; then
    log_info "Skipping toolchain installation (--skip-ntm --skip-cass --skip-cm)"
    return 0
  fi

  local manifest
  manifest=$(fetch_toolchain_manifest) || exit 1

  if [[ ":${PATH}:" != *":${DEST_DIR}:"* ]]; then
    export PATH="${DEST_DIR}:${PATH}"
  fi

  if [[ "$SKIP_NTM" == "true" ]]; then
    log_info "Skipping ntm installation (--skip-ntm)"
  else
    install_ntm_release "$manifest"
  fi

  if [[ "$SKIP_CASS" == "true" ]]; then
    log_info "Skipping cass installation (--skip-cass)"
  else
    install_upstream_tool "$manifest" "cass"
  fi

  if [[ "$SKIP_CM" == "true" ]]; then
    log_info "Skipping cm installation (--skip-cm)"
  else
    install_upstream_tool "$manifest" "cm"
  fi
}

verify_toolchain() {
  if [[ "$VERIFY" != "true" ]]; then
    return 0
  fi

  log_info "Verifying toolchain..."

  verify_command() {
    local label="$1"
    shift

    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "[DRY RUN] Would verify ${label}: $*"
      return 0
    fi

    if PATH="${DEST_DIR}:${PATH}" "$@" >/dev/null; then
      log_info "Verified: ${label}"
    else
      die "Verification failed: ${label} ($*)"
    fi
  }

  if [[ "$SKIP_NTM" != "true" ]]; then
    verify_command "ntm" ntm deps -v
  fi

  if [[ "$SKIP_CASS" != "true" ]]; then
    verify_command "cass" cass health
  fi

  if [[ "$SKIP_CM" != "true" ]]; then
    verify_command "cm" cm --version
  fi
}

# -----------------------------------------------------------------------------
# Checksum Verification
# -----------------------------------------------------------------------------

# Verify file checksum
# Args: file_path, expected_checksum
# Returns: 0 if valid, 1 if invalid
verify_checksum() {
  local file_path="$1"
  local expected="$2"
  local actual

  log_debug "Verifying checksum for: ${file_path}"
  log_debug "Expected: ${expected}"

  # Compute checksum using available tool
  if command -v sha256sum &>/dev/null; then
    actual=$(sha256sum "$file_path" | awk '{print $1}')
  elif command -v shasum &>/dev/null; then
    actual=$(shasum -a 256 "$file_path" | awk '{print $1}')
  else
    die "No sha256 tool available (need sha256sum or shasum)"
  fi

  log_debug "Actual: ${actual}"

  if [[ "$actual" != "$expected" ]]; then
    log_error "Checksum mismatch!"
    log_error "  Expected: ${expected}"
    log_error "  Actual:   ${actual}"
    return 1
  fi

  return 0
}

# Fetch and parse checksum from URL
# Args: checksum_url
# Output: checksum string (64 hex chars)
fetch_checksum() {
  local url="$1"
  local checksum_content
  local checksum

  log_debug "Fetching checksum from: ${url}"

  checksum_content=$(curl_secure "$url") || {
    die "Failed to download checksum from: ${url}"
  }

  # Parse GNU-style checksum: "abc123...  filename"
  checksum=$(echo "$checksum_content" | awk '{print $1}')

  # Validate it looks like a sha256 hash (64 hex chars)
  if ! [[ "$checksum" =~ ^[0-9a-fA-F]{64}$ ]]; then
    die "Invalid checksum format from ${url}: ${checksum}"
  fi

  echo "$checksum"
}

# -----------------------------------------------------------------------------
# Download & Install
# -----------------------------------------------------------------------------

# Download file to temp location
# Args: url, dest_path
download_file() {
  local url="$1"
  local dest="$2"

  log_debug "Downloading: ${url}"
  log_debug "Destination: ${dest}"

  if [[ "$url" == file://* ]]; then
    # Local file - just copy
    local local_path="${url#file://}"
    cp "$local_path" "$dest" || die "Failed to copy from ${local_path}"
  else
    curl_secure -o "$dest" "$url" || die "Failed to download from ${url}"
  fi
}

maybe_sudo() {
  if [[ "$SYSTEM" != "true" ]]; then
    "$@"
    return 0
  fi

  if [[ "$(id -u)" == "0" ]]; then
    "$@"
    return 0
  fi

  if ! command -v sudo &>/dev/null; then
    die "sudo is required for --system installs (DEST=${DEST_DIR})"
  fi

  sudo "$@"
}

# Install binary to destination with atomic move
# Args: source_path, dest_dir, binary_name
atomic_install() {
  local src="$1"
  local dest_dir="$2"
  local name="$3"
  local dest="${dest_dir}/${name}"

  log_debug "Installing ${name} to ${dest_dir}"

  # Ensure destination directory exists
  maybe_sudo mkdir -p "$dest_dir" || die "Failed to create directory: ${dest_dir}"

  # Make executable
  chmod +x "$src" || die "Failed to chmod: ${src}"

  # Atomic move (rename is atomic on same filesystem)
  # If cross-filesystem, mv will copy+delete
  maybe_sudo mv -f "$src" "$dest" || die "Failed to install to: ${dest}"

  log_info "Installed: ${dest}"
}

# -----------------------------------------------------------------------------
# Main Install Logic
# -----------------------------------------------------------------------------

install_brenner() {
  local platform version artifact_url checksum_url checksum
  local temp_file artifact_name

  if [[ "$SKIP_BRENNER" == "true" ]]; then
    log_info "Skipping brenner installation (--skip-brenner)"
    return 0
  fi

  log_info "Installing brenner..."

  # Detect platform
  platform=$(detect_platform) || exit 1
  log_info "Platform: ${platform}"

  # Determine artifact URL
  if [[ -n "$ARTIFACT_URL" ]]; then
    # Use override URL
    artifact_url="$ARTIFACT_URL"
    log_info "Artifact URL: ${artifact_url}"
    log_debug "Using override artifact URL: ${artifact_url}"
  else
    # Resolve version and build URL
    version=$(get_resolved_version) || exit 1
    if [[ -z "$version" ]]; then
      die "Failed to resolve brenner version"
    fi
    RESOLVED_VERSION="$version"
    log_info "Version: ${version}"
    artifact_url=$(build_artifact_url "$version" "$platform") || exit 1
    log_info "Artifact URL: ${artifact_url}"
  fi

  # Determine checksum
  if [[ -n "$CHECKSUM" ]]; then
    # Use override checksum
    checksum="$CHECKSUM"
    log_debug "Using override checksum"
  elif [[ -n "$ARTIFACT_URL" ]]; then
    # If using override URL, checksum is required
    die "--checksum is required when using --artifact-url"
  else
    # Fetch checksum from release
    checksum_url=$(build_checksum_url "$version" "$platform") || exit 1
    checksum=$(fetch_checksum "$checksum_url") || exit 1
  fi

  # Dry run check
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would download: ${artifact_url}"
    log_info "[DRY RUN] Would verify checksum: ${checksum}"
    log_info "[DRY RUN] Would install to: ${DEST_DIR}/${TOOL_NAME}"
    return 0
  fi

  ensure_temp_dir

  artifact_name=$(get_artifact_name "$platform")
  temp_file="${TEMP_DIR}/${artifact_name}"

  # Download
  log_info "Downloading brenner..."
  download_file "$artifact_url" "$temp_file"

  # Verify checksum
  log_info "Verifying checksum..."
  verify_checksum "$temp_file" "$checksum" || die "Checksum verification failed"
  log_info "Checksum verified"

  # Install
  atomic_install "$temp_file" "$DEST_DIR" "$TOOL_NAME"
}

# Verify installation
verify_installation() {
  if [[ "$VERIFY" != "true" ]] || [[ "$DRY_RUN" == "true" ]]; then
    return 0
  fi

  log_info "Verifying installation..."

  if [[ "$SKIP_BRENNER" != "true" ]]; then
    local brenner_path="${DEST_DIR}/${TOOL_NAME}"

    if [[ ! -x "$brenner_path" ]]; then
      die "Verification failed: ${brenner_path} is not executable"
    fi

    # Try running brenner
    if "$brenner_path" --help &>/dev/null; then
      log_info "Verification passed: brenner --help works"
    else
      die "Verification failed: brenner --help failed"
    fi

    local -a doctor_args=(doctor --json)
    if [[ "$SKIP_NTM" == "true" ]]; then
      doctor_args+=(--skip-ntm)
    fi
    if [[ "$SKIP_CASS" == "true" ]]; then
      doctor_args+=(--skip-cass)
    fi
    if [[ "$SKIP_CM" == "true" ]]; then
      doctor_args+=(--skip-cm)
    fi

    if PATH="${DEST_DIR}:${PATH}" "$brenner_path" "${doctor_args[@]}" >/dev/null; then
      log_info "Verification passed: brenner doctor --json works"
    else
      die "Verification failed: brenner doctor --json failed"
    fi
  fi

  verify_toolchain
}

# Configure PATH for easy-mode
configure_path() {
  if [[ "$EASY_MODE" != "true" ]]; then
    return 0
  fi

  if [[ "$SYSTEM" == "true" ]]; then
    return 0
  fi

  # Check if DEST_DIR is already in PATH
  if [[ ":${PATH}:" == *":${DEST_DIR}:"* ]]; then
    log_debug "PATH already contains ${DEST_DIR}"
    return 0
  fi

  local shell_path="${SHELL:-}"
  if [[ -z "$shell_path" ]]; then
    log_warn "SHELL is not set. Please add ${DEST_DIR} to your PATH manually."
    return 0
  fi

  # Detect shell and config file
  local shell_name config_file
  shell_name=$(basename "$shell_path")

  case "$shell_name" in
    bash)
      if [[ -f "${HOME}/.bash_profile" ]]; then
        config_file="${HOME}/.bash_profile"
      else
        config_file="${HOME}/.bashrc"
      fi
      ;;
    zsh)
      config_file="${HOME}/.zshrc"
      ;;
    fish)
      config_file="${HOME}/.config/fish/config.fish"
      ;;
    *)
      log_warn "Unknown shell: ${shell_name}. Please add ${DEST_DIR} to your PATH manually."
      return 0
      ;;
  esac

  # Add to config file if not already present
  local path_line="export PATH=\"${DEST_DIR}:\$PATH\""
  if [[ "$shell_name" == "fish" ]]; then
    path_line="set -gx PATH ${DEST_DIR} \$PATH"
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would add to ${config_file}: ${path_line}"
    return 0
  fi

  log_info "Adding ${DEST_DIR} to PATH..."

  local config_dir
  config_dir=$(dirname "$config_file")
  if [[ ! -d "$config_dir" ]]; then
    mkdir -p "$config_dir" || die "Failed to create directory: ${config_dir}"
  fi

  if grep -qF "$DEST_DIR" "$config_file" 2>/dev/null; then
    log_debug "PATH entry already in ${config_file}"
  else
    {
      echo ""
      echo "# Added by brenner installer"
      echo "$path_line"
    } >> "$config_file"
    log_info "Added to ${config_file}: ${path_line}"
    log_info "Run: source ${config_file}"
  fi
}

# -----------------------------------------------------------------------------
# Argument Parsing
# -----------------------------------------------------------------------------

usage() {
  cat <<EOF
Brenner Bot Installer

Usage:
  install.sh [options]

Options:
  --version <ver>      Version to install (default: latest)
  --dest <path>        Install destination (default: ~/.local/bin)
  --system             Install to /usr/local/bin (requires sudo)
  --artifact-url <url> Override artifact URL (requires --checksum)
  --checksum <hash>    Override checksum (64 hex chars)
  --easy-mode          Configure PATH automatically
  --verify             Verify installation after install
  --dry-run            Show what would be done without doing it
  --verbose            Show debug output
  --skip-brenner       Skip brenner binary installation
  --skip-ntm           Skip ntm installation (Unix-only tool)
  --skip-cass          Skip cass installation
  --skip-cm            Skip cm installation
  -h, --help           Show this help

Environment:
  BRENNER_VERSION      Default version if --version not specified

Examples:
  # Install latest version
  ./install.sh

  # Install specific version with verification
  ./install.sh --version 0.1.0 --verify

  # Easy mode: install and configure PATH
  ./install.sh --easy-mode --verify

  # CI/offline mode
  ./install.sh --artifact-url file:///artifacts/brenner-linux-x64 --checksum abc123...

EOF
}

parse_args() {
  DEST_DIR="$DEFAULT_DEST"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --version)
        [[ $# -ge 2 ]] || die "--version requires a value"
        VERSION="$2"
        shift 2
        ;;
      --dest)
        [[ $# -ge 2 ]] || die "--dest requires a value"
        DEST_DIR="$2"
        SYSTEM=false
        shift 2
        ;;
      --system)
        DEST_DIR="/usr/local/bin"
        SYSTEM=true
        shift
        ;;
      --artifact-url)
        [[ $# -ge 2 ]] || die "--artifact-url requires a value"
        ARTIFACT_URL="$2"
        shift 2
        ;;
      --checksum)
        [[ $# -ge 2 ]] || die "--checksum requires a value"
        CHECKSUM="$2"
        shift 2
        ;;
      --easy-mode)
        EASY_MODE=true
        shift
        ;;
      --verify)
        VERIFY=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --verbose)
        VERBOSE=true
        shift
        ;;
      --skip-brenner)
        SKIP_BRENNER=true
        shift
        ;;
      --skip-ntm)
        SKIP_NTM=true
        shift
        ;;
      --skip-cass)
        SKIP_CASS=true
        shift
        ;;
      --skip-cm)
        SKIP_CM=true
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done

  # Validate checksum format if provided
  if [[ -n "$CHECKSUM" ]] && ! [[ "$CHECKSUM" =~ ^[0-9a-fA-F]{64}$ ]]; then
    die "Invalid checksum format (expected 64 hex chars): ${CHECKSUM}"
  fi
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
  parse_args "$@"

  log_info "Brenner Bot Installer"
  log_info "Install destination: ${DEST_DIR}"

  install_brenner
  install_toolchain
  verify_installation
  configure_path

  log_info "Done!"
}

main "$@"
