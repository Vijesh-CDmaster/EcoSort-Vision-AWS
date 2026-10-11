{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.python311
    pkgs.python311Packages.virtualenv
    pkgs.python311Packages.pip
    pkgs.opencv
    pkgs.libX11
    pkgs.libXrender
    pkgs.libXrandr
    pkgs.libXi
    pkgs.freetype
    pkgs.fontconfig
    pkgs.xcb-util
    pkgs.xcb-util-image
    pkgs.xcb-util-keysyms
    pkgs.xcb-util-renderutil
  ];

  shellHook = ''
    echo "YOLO/OpenCV Nix shell ready!"
  '';
}

