import React, {useEffect, useState} from 'react'
import {Redirect} from "react-router-dom";
import axios from 'axios';
import {Row, Col, Collapse, Typography, Affix, Tag, message, Space} from 'antd';
import { TweenOneGroup } from 'rc-tween-one';

import ParametersMenu from "./ParametersMenu";
import SavePlaylist from "./SavePlaylist";
import PlaylistSuccessPage from "./PlaylistSuccessPage";
import Navbar from "./Navbar";
import ErrorScreen from "./ErrorScreen";
import SongList from "./SongList";
import SearchSeeds from "./SearchSeeds";

import {authenticate, getRecommendations, extractArtistInfo, extractTrackInfo} from "../modules/Spotify";
import Cookies from "js-cookie";

const { Panel } = Collapse;
const {Title } = Typography;

const transport = axios.create({
    withCredentials: true
});

export default function Results(props) {
    const [accessToken] = useState(Cookies.get('access_token'));
    const [songs, setSongs] = useState([]);
    const [playlist, setPlaylist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("remixr");
    const [generatedPlaylistLink, setGeneratedPlaylistLink] = useState();
    const [error, setError] = useState(false);
    // Parameters
    const [popularity, setPopularity] = useState({min: 0, max: 100});
    const [danceability, setDanceability] = useState({min: 0, max: 1});
    const [energy, setEnergy] = useState({min: 0, max: 1});
    const [acousticness, setAcousticness] = useState({min: 0, max: 1});
    const [valence, setValence] = useState({min: 0, max: 1});
    const [tempo, setTempo] = useState({min: 50, max: 200});
    const [seeds, setSeeds] = useState();

    // Fetch initial songs and load
    useEffect(() => {
        // Immediately Invoked Function Expression
        (async () => {
            if (props.location.state) {
                if (props.location.state.playlist) {
                    setPlaylist(props.location.state.playlist);
                } else if (props.location.state.seed) {
                    setSeeds(props.location.state.seed);
                    console.log("Added seed");
                    setLoading(false);
                }
            }

            if ((props.location.state && props.location.state.playlist && props.location.state.playlist.id) || (playlist && playlist.id)) {
                let id = playlist ? playlist.id : props.location.state.playlist.id;
                const url = process.env.REACT_APP_API_URL + "/results/" + id;

                try {
                    let response = await transport.get(url);

                    setSongs(response.data.songs);
                    const parameters = response.data.parameters;

                    setDanceability({
                        min: parameters.min_danceability,
                        max: parameters.max_danceability
                    });

                    setAcousticness({
                        min: parameters.min_acousticness,
                        max: parameters.max_acousticness
                    });

                    setPopularity({
                        min: parameters.min_popularity,
                        max: parameters.max_popularity
                    });

                    setEnergy({
                        min: parameters.min_energy,
                        max: parameters.max_energy
                    });

                    setValence({
                        min: parameters.min_valence,
                        max: parameters.max_valence
                    });

                    setTempo({
                        min: parameters.min_tempo,
                        max: parameters.max_tempo
                    });

                    const spotify = authenticate(accessToken);

                    let data = await Promise.all([
                        spotify.getArtists(parameters.seed_artists),
                        spotify.getTracks(parameters.seed_tracks)
                    ]);

                    let artists = data[0].body.artists.map(extractArtistInfo);
                    let tracks = data[1].body.tracks.map(extractTrackInfo);

                    setSeeds({
                        artists: artists,
                        tracks: tracks
                    });

                    let playlistName = playlist ? playlist.name : props.location.state.playlist.name;
                    setName(`remixr:${playlistName}`);
                    setLoading(false);
                } catch (e) {
                    console.log(e);
                    setError(true);
                }
            }
        })();
    }, [])

    // Update generated songs if parameters are changed
    useEffect(() => {
        if (!loading) {
            setLoading(true);
            setGeneratedPlaylistLink(null);

            let parameters = {popularity, danceability, energy, acousticness, valence, tempo};
            let limit = 100;
            getRecommendations(accessToken, parameters, seeds, limit).then(songs => {
                setSongs(songs);
                setLoading(false);
            }).catch(error => console.log(error));
        }
    }, [popularity, danceability, energy, tempo, acousticness, valence, seeds])

    // If invalid access
    // if (!props.location.state || !props.location.state.playlist) {
    //     return <Redirect to="/"/>
    // }

    // const updatePlaylist = () => {
    //
    // }

    const savePlaylist = () => {
        const url = process.env.REACT_APP_API_URL + "/save";
        transport.post(url, {
            name,
            tracks: songs.map(item => item.uri)
        }).then(response => {
            console.log("Saved playlist");
            console.log(response);
            setGeneratedPlaylistLink(response.data.link);
        }, error => {
            console.log(error);
        });
    }

    const removeSeed = (item, type) => {
        if (seeds.artists.length + seeds.tracks.length <= 1) {
            message.error("Cannot remove all seeds");
        } else {
            setSeeds({
                artists: type === "artist" ? seeds.artists.filter(artist => artist.id !== item.id): seeds.artists,
                tracks: type === "track" ? seeds.tracks.filter(track => track.id !== item.id): seeds.tracks
            });
        }
    }

    const addSeed = (item, type) => {
        if (seeds.artists.length + seeds.tracks.length >= 5) {
            message.error("Cannot add more than five seeds");
        } else {
            setSeeds({
                artists: type === "artist" ? [...seeds.artists, item]: seeds.artists,
                tracks: type === "track" ? [...seeds.tracks, item]: seeds.tracks
            });
        }
    }

    const seedTags = (
        <Space className="tagsList" size={1}>
            {seeds && seeds.artists && seeds.artists.map(artist =>
                <Tag
                    className="seedTag"
                    closable
                    onClose={e => {
                        e.preventDefault();
                        removeSeed(artist, "artist");
                    }}
                >
                    <img src={artist.image} width={60} height={60}/>
                    <div className="tagName">
                        <span>
                            {artist.name}
                        </span>
                    </div>
                </Tag>
            )}

            {seeds && seeds.tracks && seeds.tracks.map(track =>
                <Tag
                    className="seedTag"
                    closable
                    onClose={e => {
                        e.preventDefault();
                        removeSeed(track, "track");
                    }}
                >
                    <img src={track.image} width={60} height={60}/>
                    <div className="tagName">
                        <span>
                            {track.name}
                        </span>
                    </div>
                </Tag>
            )}
        </Space>
    )

    if (error) {
        return (
            <ErrorScreen/>
        )
    }

    return (
        <div>
            <Navbar/>

            {playlist ? <Title style={{textAlign: "center"}} level={2}>Generated from: {playlist.name}</Title> : null}

            {/*<SearchOld addSeed={addSeed}/>*/}
            <SearchSeeds addSeed={addSeed}/>
            {seedTags}
            <Row>
                {/* Mobile settings drawer */}
                <Col xs={24} sm={24} md={24} lg={0} xl={0}>
                    { !loading && generatedPlaylistLink ?
                        <PlaylistSuccessPage link={generatedPlaylistLink}/> :
                        <SavePlaylist name={name} setName={setName} saveHandler={savePlaylist}/>
                    }
                    <Collapse bordered={false} className="collapse-parameters rounded-component">
                        <Panel header="Tune Playlist Settings" key="1">
                            {!loading &&
                            <ParametersMenu
                                values={
                                    {energy, popularity, danceability, tempo, acousticness, valence}
                                }
                                handlers={
                                    {setEnergy, setPopularity, setDanceability, setTempo, setAcousticness, setValence}
                                }
                            />
                            }
                        </Panel>
                    </Collapse>
                </Col>

                {/* Songs */}
                <Col
                    xs={24} sm={24} md={24} lg={16} xl={16}
                >
                    <SongList loading={loading} songs={songs}/>
                </Col>

                {/* Web settings drawer */}
                <Col xs={0} sm={0} md={0} lg={8} xl={8}>
                    <Affix offsetTop={70}>
                        { generatedPlaylistLink ?
                            <PlaylistSuccessPage link={generatedPlaylistLink}/> :
                            <SavePlaylist name={name} setName={setName} saveHandler={savePlaylist}/>
                        }
                        {!loading &&
                        <div className="parameters rounded-component">
                            <Title style={{textAlign: "center"}} level={3}>Tune playlist settings</Title>
                            <ParametersMenu
                                values = {
                                    {energy, popularity, danceability, tempo, acousticness, valence}
                                }
                                handlers = {
                                    {setEnergy, setPopularity, setDanceability, setTempo, setAcousticness, setValence}
                                }
                            />
                        </div>
                        }
                    </Affix>

                </Col>
            </Row>
        </div>
    )
}