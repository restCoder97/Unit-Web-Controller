// mkzip zips a folder keeping Unix permissions, so the macOS launchers and programs stay
// executable after unzipping on the Mac (PowerShell's Compress-Archive drops them). Shell
// scripts get LF line endings whatever git checked them out with.
//
//	go run ./tools/mkzip -o dist/DUT-Controller-macOS.zip dist/DUT-Controller-macOS
package main

import (
	"archive/zip"
	"bytes"
	"flag"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	out := flag.String("o", "", "zip file to write")
	flag.Parse()
	if *out == "" || flag.NArg() != 1 {
		fmt.Fprintln(os.Stderr, "usage: mkzip -o out.zip <folder>")
		os.Exit(2)
	}
	if err := zipFolder(*out, flag.Arg(0)); err != nil {
		fmt.Fprintln(os.Stderr, "mkzip:", err)
		os.Exit(1)
	}
}

func zipFolder(out, root string) error {
	f, err := os.Create(out)
	if err != nil {
		return err
	}
	defer f.Close()
	zw := zip.NewWriter(f)
	base := filepath.Base(filepath.Clean(root)) // entries start with the folder name, so unzipping makes one folder
	err = filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(root, p)
		if err != nil {
			return err
		}
		name := filepath.ToSlash(filepath.Join(base, rel))
		info, err := d.Info()
		if err != nil {
			return err
		}
		hdr := &zip.FileHeader{Name: name, Modified: info.ModTime()}
		if d.IsDir() {
			hdr.Name += "/"
			hdr.SetMode(fs.ModeDir | 0o755)
			_, err := zw.CreateHeader(hdr)
			return err
		}
		data, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		mode := fs.FileMode(0o644)
		if strings.HasSuffix(name, ".command") || strings.HasSuffix(name, ".sh") {
			mode = 0o755
			data = bytes.ReplaceAll(data, []byte("\r\n"), []byte("\n"))
		} else if strings.Contains(name, "/bin/") {
			mode = 0o755
		}
		hdr.Method = zip.Deflate
		hdr.SetMode(mode)
		w, err := zw.CreateHeader(hdr)
		if err != nil {
			return err
		}
		_, err = w.Write(data)
		return err
	})
	if err != nil {
		return err
	}
	return zw.Close()
}
