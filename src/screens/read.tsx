import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system';
import { FC, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ListRenderItemInfo,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { DEFAULT_DIRECTORIES_PATH, NO_HEADER } from '../lib/constants';
import { readChapter } from '../lib/gallery';
import { RootStackParamList } from '../lib/interfaces';
import { PrimaryText } from '../lib/style';
import { theme } from '../lib/theme';

type ChapterReadScreenProps = NativeStackScreenProps<RootStackParamList, 'Read'>;

const Page: FC<{ path: string; width: number; onPress: () => void }> = ({
  path,
  width,
  onPress,
}) => {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    Image.getSize(path, (w, h) => {
      const newHeight = (width / w) * h;
      setHeight(newHeight);
    });
  }, []);
  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <Image source={{ uri: path, width, height }} />
    </TouchableWithoutFeedback>
  );
};

const directoriesPath = `${FileSystem.documentDirectory}${DEFAULT_DIRECTORIES_PATH}`;

export const ChapterReadScreen: FC<ChapterReadScreenProps> = ({ route, navigation }) => {
  const { chapter, gallery } = route.params;
  const listRef = useRef<FlatList<string>>();
  const dimensions = useWindowDimensions();
  const [show, setShow] = useState(false);
  const renderItem = (it: ListRenderItemInfo<string>) => (
    <Page
      path={`${directoriesPath}/${gallery.path}/${chapter.path}/${it.item}`}
      width={dimensions.width}
      onPress={() => {
        if (show) {
          navigation.setOptions(NO_HEADER);
        } else {
          navigation.setOptions({
            headerBackTitleVisible: true,
            headerBackVisible: true,
            headerTransparent: false,
            title: `${route.params.gallery.name} / ${route.params.chapter.name}`,
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: theme.palette.background,
            },
            headerTitle: () => (
              <PrimaryText style={{ fontSize: 18 }} allowFontScaling>
                {route.params.gallery.name} / {route.params.chapter.name}
              </PrimaryText>
            ),
          });
        }
        setShow((prev) => !prev);
      }}
    />
  );

  const handleEndReached = () => {
    const index = gallery.chapters.findIndex((it) => it.name === chapter.name);
    if (index < 0) return;
    const nextChapter =
      gallery.chapters.length - 1 > index ? gallery.chapters[index + 1] : undefined;
    if (nextChapter == null) return;
    Alert.alert('Next chapter', 'Want to read the next chapter?', [
      {
        style: 'default',
        text: 'Next',
        onPress: () => {
          readChapter(gallery.id, index);
          navigation.replace('Read', { chapter: nextChapter, gallery });
        },
      },
      { style: 'cancel', text: 'Cancel' },
    ]);
  };

  return (
    <FlatList
      data={chapter.pages}
      renderItem={renderItem}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0}
      keyExtractor={(it) => it}
      ref={listRef as any}
    />
  );
};
