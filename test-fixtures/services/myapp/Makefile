# Test Makefile for subdirectory build test
docker_tag ?= test

.PHONY: build check-dir

build:
	@echo "Building from directory: $$(pwd)"
	@echo "docker_tag=$(docker_tag)"
	@test -f Dockerfile || (echo "ERROR: Dockerfile not found in $$(pwd)" && exit 1)
	@echo "SUCCESS: Dockerfile found, build would succeed"

check-dir:
	@echo "Current directory: $$(pwd)"
	@echo "Makefile location: $$(dirname $(MAKEFILE_LIST))"
	@ls -la
