#!/bin/bash

# 我需要把static/ 和 templates/ 目录下的文件复制到 /opt/1panel/www/sites/logfolio/index 目录下
# 如果有同名文件，则覆盖

cp -r static/ /opt/1panel/www/sites/logfolio/index/

# 是只复制templates/ 目录下的文件，而不是复制整个templates/ 目录
cp -r templates/* /opt/1panel/www/sites/logfolio/index/