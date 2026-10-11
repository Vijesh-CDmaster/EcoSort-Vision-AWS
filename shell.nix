{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.python311
    pkgs.python311Packages.virtualenv
    pkgs.pkg-config
    pkgs.xorg.libxcb
    pkgs.xorg.libX11
    pkgs.xorg.libXrender
    pkgs.xorg.libXext
    pkgs.ffmpeg             # for video handling in OpenCV
  ];

  shellHook = ''
  export PYTHONNOUSERSITE="true"
  if [ ! -d .venv ]; then
    python3 -m venv .venv
  fi
  source .venv/bin/activate
  pip install --upgrade pip
  pip install --no-cache-dir -r yolo-service/requirements.txt
'';

 
  
}
